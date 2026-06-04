// POST /api/export/onedrive
//
// Exports a campaign's dataset to the signed-in researcher's OneDrive
// (folder /Lingo) via Microsoft Graph. Gated on Microsoft Entra credentials:
// returns 503 when the feature is unconfigured or the user has no usable Graph
// token, so the rest of the app is unaffected until Microsoft login is wired.
//
// Body: { campaignId: string }
// Returns: { ok: true, webUrl, name } | { error } with an HTTP status.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isMember } from "@/lib/membership";
import {
  isOneDriveConfigured,
  getGraphAccessToken,
  buildDatasetExport,
  uploadToOneDrive,
} from "@/lib/onedrive";

export async function POST(req: Request) {
  // Hard gate: inert until Microsoft Entra creds are configured.
  if (!isOneDriveConfigured()) {
    return NextResponse.json(
      { error: "OneDrive export not configured" },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let campaignId: string | undefined;
  try {
    const body = (await req.json()) as { campaignId?: string };
    campaignId = body?.campaignId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!campaignId) {
    return NextResponse.json(
      { error: "campaignId is required" },
      { status: 400 },
    );
  }

  // Researcher must own / manage the campaign (same roles as the export route).
  if (!(await isMember(campaignId, session.user.id, ["owner", "manager"]))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Resolve the user's Microsoft Graph token (refreshing if needed). Absent =>
  // the user hasn't linked Microsoft yet, so the feature is unavailable to them.
  const accessToken = await getGraphAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json(
      {
        error: "OneDrive export not configured",
        detail:
          "No linked Microsoft account or Graph token. Sign in with Microsoft to enable OneDrive export.",
      },
      { status: 503 },
    );
  }

  const origin = new URL(req.url).origin;

  try {
    // Reuse the existing export logic (does its own auth/role check too).
    const { bytes, filename, contentType } = await buildDatasetExport(
      campaignId,
      origin,
    );

    const result = await uploadToOneDrive(
      accessToken,
      filename,
      bytes,
      contentType,
    );

    return NextResponse.json({
      ok: true,
      webUrl: result.webUrl,
      name: result.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    // A 401 from Graph usually means the token expired and refresh failed —
    // surface as 503 so the UI can prompt a re-login with Microsoft.
    const status = /\b401\b/.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
