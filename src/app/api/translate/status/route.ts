import { NextResponse } from "next/server";
import { listModels } from "@/lib/translate";

// Liveness probe for the t2t worker. Returns whether a worker answered and the
// models it has loaded, so the UI can disable translation when the server is off.
export async function GET() {
  if (!process.env.REDIS_URL)
    return NextResponse.json({ online: false, models: [], configured: false });
  try {
    const models = await listModels(5000);
    return NextResponse.json({ online: true, models, configured: true });
  } catch {
    return NextResponse.json({ online: false, models: [], configured: true });
  }
}
