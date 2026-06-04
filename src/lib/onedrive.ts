// OneDrive / Microsoft Graph export helpers.
//
// These helpers are pure `fetch` (no Node SDKs) so they run on Cloudflare
// Workers via OpenNext. They are inert unless the Microsoft Entra (Azure AD)
// credentials are configured AND the signed-in researcher has a linked
// Microsoft account with a usable Graph access token.
//
// The whole feature is gated by `isOneDriveConfigured()` — callers MUST check
// it (or handle a thrown `OneDriveNotConfiguredError`) and return a 503 so the
// app keeps working when Microsoft login isn't set up.

import { and, eq } from "drizzle-orm";
import { getDb, accounts } from "@/db";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// The Auth.js provider id for the Microsoft Entra ID provider. This is what the
// DrizzleAdapter stores in the `Account.provider` column for Microsoft logins.
export const MICROSOFT_PROVIDER = "microsoft-entra-id";

// Microsoft small-file PUT limit is 4 MB. Above this you must use an upload
// session (see `noteLargeFileUpload` below). Most dataset manifests are well
// under this, but audio-bundled exports could exceed it.
export const SMALL_FILE_LIMIT = 4 * 1024 * 1024;

export class OneDriveNotConfiguredError extends Error {
  constructor(message = "OneDrive export not configured") {
    super(message);
    this.name = "OneDriveNotConfiguredError";
  }
}

/**
 * True only when the Microsoft Entra credentials are present in the
 * environment. Until these are set as Worker secrets the whole feature stays
 * inert. (The Auth.js Microsoft provider is gated on the same env vars.)
 */
export function isOneDriveConfigured(): boolean {
  return Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
  );
}

interface StoredAccount {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  scope: string | null;
}

/**
 * Read the user's linked Microsoft account row from the `Account` table.
 * Because the app uses the JWT session strategy, the Graph tokens are NOT on
 * the session object — they are persisted by the DrizzleAdapter when the user
 * links their Microsoft account. We read them straight from the DB here.
 */
async function getMicrosoftAccount(
  userId: string,
): Promise<StoredAccount | null> {
  const db = await getDb();
  const rows = await db
    .select({
      access_token: accounts.access_token,
      refresh_token: accounts.refresh_token,
      expires_at: accounts.expires_at,
      scope: accounts.scope,
    })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.provider, MICROSOFT_PROVIDER),
      ),
    )
    .limit(1);
  return (rows[0] as StoredAccount | undefined) ?? null;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/**
 * Refresh an expired Microsoft Graph access token using the stored refresh
 * token (requires the `offline_access` scope to have been granted at login).
 * Returns the new access token, or null if refresh is impossible.
 *
 * NOTE: we do not persist the refreshed token back to the DB here to avoid
 * coupling to the adapter's write path; the token is used for the immediate
 * request. The next interactive login (or Auth.js's own refresh flow, if the
 * main dev wires a `jwt` callback that persists rotated tokens) keeps the
 * stored copy fresh. See docs/onedrive-graph-export.md.
 */
async function refreshAccessToken(
  refreshToken: string,
): Promise<string | null> {
  if (!isOneDriveConfigured()) return null;
  // Multi-tenant default issuer is "common"; override via AUTH_MICROSOFT_ENTRA_ID_ISSUER.
  const issuer =
    process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ??
    "https://login.microsoftonline.com/common/v2.0";
  // Derive the OAuth token endpoint from the issuer (strip trailing /v2.0).
  const tenantBase = issuer.replace(/\/v2\.0\/?$/, "");
  const tokenUrl = `${tenantBase}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID as string,
    client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET as string,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: "openid profile email offline_access User.Read Files.ReadWrite",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as TokenResponse;
  return json.access_token ?? null;
}

/**
 * Resolve a usable Microsoft Graph access token for a user, refreshing it if
 * the stored one has expired. Returns null when the feature is unconfigured or
 * the user has no linked Microsoft account / no usable token.
 */
export async function getGraphAccessToken(
  userId: string,
): Promise<string | null> {
  if (!isOneDriveConfigured()) return null;
  const account = await getMicrosoftAccount(userId);
  if (!account) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const expired =
    typeof account.expires_at === "number" && account.expires_at <= nowSec + 60;

  if (!expired && account.access_token) return account.access_token;

  if (account.refresh_token) {
    const refreshed = await refreshAccessToken(account.refresh_token);
    if (refreshed) return refreshed;
  }
  // Fall back to the stored token even if it looks expired — Graph will reject
  // it with 401 and the caller surfaces a re-login hint.
  return account.access_token;
}

export interface UploadResult {
  ok: true;
  webUrl: string;
  id: string;
  name: string;
}

/**
 * Upload a small (<= 4 MB) file to the user's OneDrive under /Lingo/{filename}
 * via the simple content PUT. Returns the DriveItem incl. its shareable webUrl.
 *
 * For files larger than SMALL_FILE_LIMIT you must use a resumable upload
 * session instead — see `noteLargeFileUpload()` for the exact steps. Dataset
 * JSON manifests are small, so the simple path is used by default.
 */
export async function uploadToOneDrive(
  accessToken: string,
  filename: string,
  data: Uint8Array | ArrayBuffer,
  contentType = "application/octet-stream",
): Promise<UploadResult> {
  const bytes =
    data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);

  if (bytes.byteLength > SMALL_FILE_LIMIT) {
    throw new Error(
      `File ${filename} is ${bytes.byteLength} bytes which exceeds the ${SMALL_FILE_LIMIT}-byte simple-upload limit; use a resumable upload session (see noteLargeFileUpload).`,
    );
  }

  // %-encode each path segment so spaces / special chars survive the URL.
  const safeName = encodeURIComponent(filename);
  const url = `${GRAPH_BASE}/me/drive/root:/Lingo/${safeName}:/content`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: bytes as unknown as BodyInit,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `OneDrive upload failed (${res.status} ${res.statusText}): ${detail.slice(0, 500)}`,
    );
  }

  const item = (await res.json()) as {
    id?: string;
    name?: string;
    webUrl?: string;
  };
  return {
    ok: true,
    id: item.id ?? "",
    name: item.name ?? filename,
    webUrl: item.webUrl ?? "",
  };
}

/**
 * Resumable upload session reference (for files > 4 MB). Not wired by default
 * because dataset manifests are small. To implement:
 *
 *   1. POST {GRAPH_BASE}/me/drive/root:/Lingo/{name}:/createUploadSession
 *        body: { item: { "@microsoft.graph.conflictBehavior": "replace" } }
 *      -> returns { uploadUrl }
 *   2. PUT the file to `uploadUrl` in chunks (recommended 5–10 MB, each a
 *      multiple of 320 KiB) with headers:
 *        Content-Length: <chunk size>
 *        Content-Range: bytes {start}-{end}/{total}
 *      No Authorization header is needed on chunk PUTs (the uploadUrl is
 *      pre-authorized).
 *   3. The final chunk's 200/201 response is the completed DriveItem (webUrl).
 */
export function noteLargeFileUpload(): string {
  return "Use POST /me/drive/root:/Lingo/{name}:/createUploadSession then PUT chunks (multiples of 320 KiB) with Content-Range headers.";
}

/**
 * Build the dataset export payload by REUSING the existing export route's
 * logic (GET /api/campaigns/[id]/export). We invoke that handler directly with
 * a synthesized Request rather than duplicating the Drizzle queries / manifest
 * shape, so the OneDrive export always matches the downloadable export.
 *
 * Returns the raw bytes, a suggested filename, and the content type.
 */
export async function buildDatasetExport(
  campaignId: string,
  origin: string,
): Promise<{ bytes: Uint8Array; filename: string; contentType: string }> {
  // Import lazily to avoid any import cycle and to keep this module loadable
  // even if the route module evolves.
  const { GET } = await import(
    "@/app/api/campaigns/[id]/export/route"
  );

  // The route reads `new URL(req.url).origin` for absolute audio URLs and
  // calls `auth()` internally for the auth/role check, so it must run inside
  // the same request scope as the caller (which it does — the OneDrive route
  // forwards the authenticated request context).
  const req = new Request(`${origin}/api/campaigns/${campaignId}/export`, {
    method: "GET",
  });

  const res = await GET(req, {
    params: Promise.resolve({ id: campaignId }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Dataset export failed (${res.status}): ${detail.slice(0, 300)}`,
    );
  }

  const buf = new Uint8Array(await res.arrayBuffer());

  // Mirror the route's Content-Disposition filename if present, else fall back.
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = cd.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `lingo-${campaignId}.json`;
  const contentType =
    res.headers.get("Content-Type")?.split(";")[0] ?? "application/json";

  return { bytes: buf, filename, contentType };
}
