# OneDrive / Microsoft Graph dataset export

Lets a researcher (campaign owner/manager) push a campaign's dataset export
straight to **their own OneDrive** (folder `/Lingo`) using Microsoft Graph with
their delegated permissions. This pairs with adding **"Sign in with Microsoft"**
(Microsoft Entra ID / Azure AD) to Auth.js.

The whole feature is **inert until the Microsoft Entra credentials are set** as
Worker secrets. Before that, `POST /api/export/onedrive` returns
`503 { error: "OneDrive export not configured" }` and nothing else changes.

---

## 1. Azure Portal — register the app

1. Go to **Azure Portal -> Microsoft Entra ID -> App registrations -> New
   registration**.
2. **Name**: `Lingo` (or `Lingo OneDrive Export`).
3. **Supported account types**: pick based on who logs in:
   - _Accounts in any organizational directory and personal Microsoft accounts_
     (multi-tenant + personal) is the most permissive — required if researchers
     use personal `@outlook.com` OneDrive accounts. Issuer tenant = `common`.
   - _Single tenant_ if all researchers are in one org. Issuer tenant = your
     tenant GUID.
4. **Redirect URI**: platform **Web**, value:
   - Production: `https://YOUR_DOMAIN/api/auth/callback/microsoft-entra-id`
   - Local dev: `http://localhost:3000/api/auth/callback/microsoft-entra-id`

   The path segment **must** be `microsoft-entra-id` — that is the Auth.js
   provider id and the value stored in `Account.provider`
   (`MICROSOFT_PROVIDER` in `src/lib/onedrive.ts`).
5. Click **Register**. Copy the **Application (client) ID** and the
   **Directory (tenant) ID** from the Overview page.

### Client secret

6. **Certificates & secrets -> New client secret**. Copy the secret **Value**
   (not the Secret ID) immediately — it is shown only once.

### API permissions (delegated Microsoft Graph scopes)

7. **API permissions -> Add a permission -> Microsoft Graph -> Delegated
   permissions**, add all of:
   - `Files.ReadWrite` — write the export file into the user's OneDrive.
   - `offline_access` — issues a **refresh token** so exports work after the
     access token (~1h) expires.
   - `openid`, `profile`, `email` — OIDC sign-in claims.
   - `User.Read` — basic profile.
8. For multi-tenant + personal accounts these are user-consentable, so no admin
   consent is required. If your tenant enforces admin consent, click
   **Grant admin consent for <tenant>**.

---

## 2. Secrets / environment variables

The Auth.js Microsoft provider and the OneDrive helpers read the same env vars.
Setting them turns the feature on.

| Variable | Value |
| --- | --- |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Application (client) ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Client secret **Value** |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | Issuer URL (see below) — optional, defaults to `common` |

**Issuer** format:
- Multi-tenant + personal: `https://login.microsoftonline.com/common/v2.0`
- Single tenant: `https://login.microsoftonline.com/<TENANT_ID>/v2.0`

`isOneDriveConfigured()` only requires `..._ID` and `..._SECRET`; the issuer
falls back to `common`.

### Local dev (`.env.local`)

```
AUTH_MICROSOFT_ENTRA_ID_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AUTH_MICROSOFT_ENTRA_ID_SECRET=your-secret-value
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/common/v2.0
```

### Production (Cloudflare Worker secrets)

```
npx wrangler secret put AUTH_MICROSOFT_ENTRA_ID_ID
npx wrangler secret put AUTH_MICROSOFT_ENTRA_ID_SECRET
npx wrangler secret put AUTH_MICROSOFT_ENTRA_ID_ISSUER
```

---

## 3. Auth.js provider wiring (done by the main dev)

In `src/auth.ts`, add the provider gated on the env vars and request the Graph
scopes plus offline access (so tokens can be refreshed):

```ts
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

if (
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER, // optional
      authorization: {
        params: {
          scope:
            "openid profile email offline_access User.Read Files.ReadWrite",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  );
}
```

### Persisting the Graph token

The app uses `session: { strategy: "jwt" }`. With the DrizzleAdapter present,
Auth.js still writes the `access_token`, `refresh_token`, `expires_at`, and
`scope` into the **`Account` table** when a user links Microsoft. The OneDrive
helper reads them straight from there (`getMicrosoftAccount` in
`src/lib/onedrive.ts`) — **no session-callback changes are required** for the
export to work.

> The helper refreshes an expired token on demand using the stored refresh
> token, but does not write the rotated token back to the DB (to avoid coupling
> to the adapter write path). If you want the stored copy kept fresh
> automatically, add a `jwt` callback in `src/auth.ts` that persists rotated
> tokens to the `Account` row. Otherwise the stored refresh token keeps working
> until the user re-links.

---

## 4. Token refresh — how it works

1. At login, with `offline_access` granted, Microsoft returns an access token
   (~1 hour) **and** a refresh token. The adapter stores both on the `Account`
   row with `expires_at` (unix seconds).
2. On export, `getGraphAccessToken(userId)` checks `expires_at`. If still valid
   it uses the stored access token.
3. If expired (or within 60s of expiry), it POSTs to the tenant token endpoint
   (`{issuer-base}/oauth2/v2.0/token`) with `grant_type=refresh_token` and the
   stored refresh token to get a fresh access token for that request.
4. If refresh fails (e.g. revoked consent), the export route returns `503` so
   the UI can prompt the researcher to sign in with Microsoft again.

---

## 5. What the export route does

`POST /api/export/onedrive` (`src/app/api/export/onedrive/route.ts`):

1. `503` if `isOneDriveConfigured()` is false.
2. Requires an authenticated user; requires they are `owner`/`manager` of the
   `campaignId` in the body.
3. Resolves the user's Graph token; `503` if none.
4. Builds the dataset export by **reusing** the existing
   `GET /api/campaigns/[id]/export` handler (no duplicated query/manifest
   logic) via `buildDatasetExport()`.
5. Uploads to `PUT /me/drive/root:/Lingo/{filename}:/content` (small-file path,
   < 4 MB). For larger exports use a resumable **upload session** — see the
   `noteLargeFileUpload()` comment block in `src/lib/onedrive.ts`.
6. Returns `{ ok: true, webUrl, name }` with the OneDrive link.

---

## 6. Verifying

1. Set the three secrets and deploy (or set `.env.local` and run dev).
2. Sign in with Microsoft, consenting to the listed scopes.
3. Open a campaign you own and click **Export to OneDrive**.
4. Confirm a `Lingo/lingo-<lang>-<id>.json` file appears in the researcher's
   OneDrive and the response `webUrl` opens it.
