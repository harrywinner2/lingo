// Google Drive export helpers + an incremental "Connect Drive" OAuth flow.
//
// Researcher-only by design: normal Google sign-in stays minimal (openid/email),
// and Drive access is granted on demand via /api/connect/google-drive. The Drive
// tokens are stored separately in the Account table under provider
// "google-drive" so they never touch the login scope.
//
// Pure `fetch` (no Node SDKs) → runs on Cloudflare Workers via OpenNext.

import { and, eq } from "drizzle-orm";
import { getDb, accounts } from "@/db";

export const DRIVE_PROVIDER = "google-drive";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

export function callbackUrl(origin: string): string {
  return `${origin}/api/connect/google-drive/callback`;
}

/** Build the Google consent URL that requests drive.file (+ a refresh token). */
export function buildConnectUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID as string,
    redirect_uri: callbackUrl(origin),
    response_type: "code",
    scope: `openid ${DRIVE_SCOPE}`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

/** Exchange an auth code for tokens and persist them for the user. */
export async function exchangeAndStore(
  userId: string,
  code: string,
  origin: string,
): Promise<boolean> {
  const body = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID as string,
    client_secret: process.env.AUTH_GOOGLE_SECRET as string,
    code,
    grant_type: "authorization_code",
    redirect_uri: callbackUrl(origin),
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  const t = (await res.json()) as TokenResponse;
  if (!t.access_token) return false;

  const db = await getDb();
  const expires_at = t.expires_in
    ? Math.floor(Date.now() / 1000) + t.expires_in
    : null;
  const row = {
    userId,
    type: "oauth",
    provider: DRIVE_PROVIDER,
    providerAccountId: userId, // one Drive link per user
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? null,
    expires_at,
    scope: t.scope ?? DRIVE_SCOPE,
    token_type: "Bearer",
  };
  await db
    .insert(accounts)
    .values(row)
    .onConflictDoUpdate({
      target: [accounts.provider, accounts.providerAccountId],
      set: {
        access_token: row.access_token,
        // Google omits refresh_token on re-consent sometimes; keep the old one.
        ...(row.refresh_token ? { refresh_token: row.refresh_token } : {}),
        expires_at: row.expires_at,
        scope: row.scope,
      },
    });
  return true;
}

interface StoredAccount {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
}

async function getDriveAccount(userId: string): Promise<StoredAccount | null> {
  const db = await getDb();
  const rows = await db
    .select({
      access_token: accounts.access_token,
      refresh_token: accounts.refresh_token,
      expires_at: accounts.expires_at,
    })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, DRIVE_PROVIDER)))
    .limit(1);
  return (rows[0] as StoredAccount | undefined) ?? null;
}

async function refresh(refreshToken: string): Promise<string | null> {
  const body = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID as string,
    client_secret: process.env.AUTH_GOOGLE_SECRET as string,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const t = (await res.json()) as TokenResponse;
  return t.access_token ?? null;
}

/** True once the user has connected Drive (has a stored token). */
export async function hasDriveConnected(userId: string): Promise<boolean> {
  return Boolean(await getDriveAccount(userId));
}

/** A usable Drive access token for the user, refreshing if needed. null if not connected. */
export async function getDriveAccessToken(userId: string): Promise<string | null> {
  const acc = await getDriveAccount(userId);
  if (!acc) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  const expired =
    typeof acc.expires_at === "number" && acc.expires_at <= nowSec + 60;
  if (!expired && acc.access_token) return acc.access_token;
  if (acc.refresh_token) {
    const fresh = await refresh(acc.refresh_token);
    if (fresh) return fresh;
  }
  return acc.access_token;
}

async function findOrCreateLingoFolder(token: string): Promise<string | null> {
  // With drive.file we can only see files this app created, so this finds the
  // app's own Lingo folder (or makes one).
  const q = encodeURIComponent(
    "name='Lingo' and mimeType='application/vnd.google-apps.folder' and trashed=false",
  );
  const find = await fetch(`${FILES_URL}?q=${q}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (find.ok) {
    const j = (await find.json()) as { files?: Array<{ id: string }> };
    if (j.files && j.files[0]) return j.files[0].id;
  }
  const create = await fetch(`${FILES_URL}?fields=id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Lingo", mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!create.ok) return null;
  return ((await create.json()) as { id?: string }).id ?? null;
}

export interface DriveUploadResult {
  ok: true;
  webUrl: string;
  id: string;
  name: string;
}

/** Multipart-upload a file into the user's Drive (Lingo folder). */
export async function uploadToDrive(
  accessToken: string,
  filename: string,
  data: Uint8Array | ArrayBuffer,
  contentType = "application/octet-stream",
): Promise<DriveUploadResult> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
  const folderId = await findOrCreateLingoFolder(accessToken);
  const metadata: Record<string, unknown> = { name: filename };
  if (folderId) metadata.parents = [folderId];

  const boundary = "lingo_boundary_" + filename.replace(/[^a-zA-Z0-9]/g, "");
  const pre =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`;
  const post = `\r\n--${boundary}--`;
  const blob = new Blob([pre, bytes as unknown as BlobPart, post]);

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: blob,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Google Drive upload failed (${res.status} ${res.statusText}): ${detail.slice(0, 400)}`,
    );
  }
  const item = (await res.json()) as { id?: string; name?: string; webViewLink?: string };
  return {
    ok: true,
    id: item.id ?? "",
    name: item.name ?? filename,
    webUrl: item.webViewLink ?? "",
  };
}
