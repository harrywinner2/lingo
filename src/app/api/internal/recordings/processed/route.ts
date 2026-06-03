import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, recordings } from "@/db";
import { deleteObject } from "@/lib/storage";

// Called by the preprocessing worker once a clip is normalized.
export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    recordingId?: string;
    cleanKey?: string;
    cleanUrl?: string;
    durationMs?: number;
    metrics?: unknown;
    rejected?: boolean;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.recordingId)
    return NextResponse.json({ error: "Missing recordingId" }, { status: 400 });

  const db = await getDb();
  const recording = (
    await db.select().from(recordings).where(eq(recordings.id, body.recordingId)).limit(1)
  )[0];
  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.rejected) {
    await db
      .update(recordings)
      .set({
        status: "rejected",
        qualityMetrics: JSON.stringify({ rejected: true, reason: body.reason }),
      })
      .where(eq(recordings.id, recording.id));
    if (recording.rawKey) await deleteObject(recording.rawKey).catch(() => {});
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  await db
    .update(recordings)
    .set({
      status: "ready",
      cleanKey: body.cleanKey ?? null,
      audioUrl: body.cleanUrl ?? recording.audioUrl,
      durationMs: body.durationMs ?? recording.durationMs,
      qualityMetrics: body.metrics ? JSON.stringify(body.metrics) : null,
    })
    .where(eq(recordings.id, recording.id));

  if (recording.rawKey && !recording.deliveredToDrive) {
    await deleteObject(recording.rawKey).catch(() => {});
    await db
      .update(recordings)
      .set({ rawDeleted: true })
      .where(eq(recordings.id, recording.id));
  }

  return NextResponse.json({ ok: true, status: "ready" });
}
