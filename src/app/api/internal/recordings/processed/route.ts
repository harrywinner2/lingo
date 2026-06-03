import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/storage";

// Called by the preprocessing worker once a clip is normalized. Promotes the
// recording to "ready", attaches quality metrics + the clean object, and purges
// the raw upload (unless it still needs delivering to the researcher's Drive).
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

  const recording = await prisma.recording.findUnique({
    where: { id: body.recordingId },
  });
  if (!recording)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-reject clips that fail quality gates in the worker (silent, too short…).
  if (body.rejected) {
    await prisma.recording.update({
      where: { id: recording.id },
      data: {
        status: "rejected",
        qualityMetrics: JSON.stringify({ rejected: true, reason: body.reason }),
      },
    });
    if (recording.rawKey) {
      await deleteObject(recording.rawKey).catch(() => {});
    }
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  await prisma.recording.update({
    where: { id: recording.id },
    data: {
      status: "ready",
      cleanKey: body.cleanKey ?? null,
      audioUrl: body.cleanUrl ?? recording.audioUrl,
      durationMs: body.durationMs ?? recording.durationMs,
      qualityMetrics: body.metrics ? JSON.stringify(body.metrics) : null,
    },
  });

  // Purge raw now that we have a clean copy. (OneDrive delivery, when enabled,
  // will happen before this and set deliveredToDrive; until then we just purge.)
  if (recording.rawKey && !recording.deliveredToDrive) {
    await deleteObject(recording.rawKey).catch(() => {});
    await prisma.recording.update({
      where: { id: recording.id },
      data: { rawDeleted: true },
    });
  }

  return NextResponse.json({ ok: true, status: "ready" });
}
