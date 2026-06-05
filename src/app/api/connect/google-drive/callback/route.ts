// GET /api/connect/google-drive/callback
// Google redirects here after Drive consent. Exchanges the code, stores the
// Drive token for the signed-in researcher, then returns to where they started.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isGoogleConfigured, exchangeAndStore } from "@/lib/google-drive";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const ret = decodeURIComponent(url.searchParams.get("state") || "/app");
  const dest = ret.startsWith("/") ? `${origin}${ret}` : `${origin}/app`;

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${dest}?drive=error`);
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${origin}/signin`);
  }
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("error")) {
    return NextResponse.redirect(`${dest}?drive=denied`);
  }
  const ok = await exchangeAndStore(session.user.id, code, origin);
  return NextResponse.redirect(`${dest}?drive=${ok ? "connected" : "error"}`);
}
