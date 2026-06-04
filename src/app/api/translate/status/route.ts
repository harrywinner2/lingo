import { NextResponse } from "next/server";
import { readStatus } from "@/lib/translate";

// Liveness + device probe for the t2t worker fleet. Reads Redis heartbeat keys
// directly (no job enqueued), so it's cheap enough to poll for the live banner.
export async function GET() {
  if (!process.env.REDIS_URL)
    return NextResponse.json({ online: false, device: "cpu", models: [], configured: false });
  try {
    const s = await readStatus(4000);
    return NextResponse.json({ ...s, configured: true });
  } catch {
    return NextResponse.json({ online: false, device: "cpu", models: [], configured: true });
  }
}
