// POST /api/export/google-drive   body: { campaignId }
// Exports a campaign's dataset to the researcher's Google Drive (Lingo folder).
// Returns 503 {connect:true} when the user hasn't linked Drive yet, so the UI
// can send them through /api/connect/google-drive first.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isMember } from "@/lib/membership";
import { isGoogleConfigured, getDriveAccessToken, uploadToDrive } from "@/lib/google-drive";
import { buildDatasetExport } from "@/lib/onedrive"; // provider-agnostic export builder

export async function POST(req: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Google Drive export not configured" }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let campaignId: string | undefined;
  try {
    campaignId = ((await req.json()) as { campaignId?: string })?.campaignId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }
  if (!(await isMember(campaignId, session.user.id, ["owner", "manager"]))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = await getDriveAccessToken(session.user.id);
  if (!token) {
    return NextResponse.json(
      { error: "Google Drive not connected", connect: true },
      { status: 503 },
    );
  }

  const origin = new URL(req.url).origin;
  try {
    const { bytes, filename, contentType } = await buildDatasetExport(campaignId, origin);
    const result = await uploadToDrive(token, filename, bytes, contentType);
    return NextResponse.json({ ok: true, webUrl: result.webUrl, name: result.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    // 401 from Drive => token died and refresh failed => ask to reconnect.
    const status = /\b401\b/.test(message) ? 503 : 502;
    return NextResponse.json(
      status === 503 ? { error: message, connect: true } : { error: message },
      { status },
    );
  }
}
