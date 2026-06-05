// GET /api/connect/google-drive?return=<path>
// Starts the incremental Drive-consent flow for the signed-in researcher.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isGoogleConfigured, buildConnectUrl } from "@/lib/google-drive";

export async function GET(req: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Google not configured" }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const origin = new URL(req.url).origin;
  const ret = new URL(req.url).searchParams.get("return") || "/app";
  // State carries only the post-consent return path; the callback re-checks the
  // authenticated session and stores the token against that user.
  const state = encodeURIComponent(ret);
  return NextResponse.redirect(buildConnectUrl(origin, state));
}
