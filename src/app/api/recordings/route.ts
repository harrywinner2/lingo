import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, prompts, campaigns, memberships, recordings } from "@/db";
import { putObject } from "@/lib/storage";
import { preprocessingEnabled, enqueuePreprocess } from "@/lib/queue";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const db = await getDb();

  const form = await req.formData();
  const file = form.get("audio");
  const promptId = String(form.get("promptId") || "");
  const durationMs = Number(form.get("durationMs") || 0);

  if (!(file instanceof Blob) || !promptId)
    return NextResponse.json({ error: "Missing audio or promptId" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024)
    return NextResponse.json({ error: "File too large" }, { status: 413 });

  const prompt = (
    await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1)
  )[0];
  if (!prompt)
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  const campaign = (
    await db.select().from(campaigns).where(eq(campaigns.id, prompt.campaignId)).limit(1)
  )[0];
  const allowed =
    campaign?.ownerId === userId ||
    (
      await db
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.campaignId, prompt.campaignId),
            eq(memberships.userId, userId),
            inArray(memberships.role, ["owner", "manager", "speaker"]),
            inArray(memberships.status, ["active", "probation"]),
          ),
        )
        .limit(1)
    ).length > 0;
  if (!allowed)
    return NextResponse.json({ error: "Not a speaker on this campaign" }, { status: 403 });

  const type = file.type || "audio/webm";
  const ext = type.includes("mp4") || type.includes("aac")
    ? "m4a"
    : type.includes("ogg")
      ? "ogg"
      : type.includes("wav")
        ? "wav"
        : "webm";
  const rawKey = `raw/${prompt.campaignId}/${randomBytes(12).toString("hex")}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const url = await putObject(rawKey, buf, type);

  const willPreprocess = preprocessingEnabled();
  const recording = (
    await db
      .insert(recordings)
      .values({
        promptId,
        campaignId: prompt.campaignId,
        speakerId: userId,
        audioUrl: url,
        rawKey,
        mimeType: type,
        durationMs: Number.isFinite(durationMs) ? Math.round(durationMs) : 0,
        status: willPreprocess ? "processing" : "ready",
      })
      .returning()
  )[0];

  if (willPreprocess) {
    try {
      await enqueuePreprocess({ recordingId: recording.id, rawKey, mimeType: type });
    } catch {
      await db
        .update(recordings)
        .set({ status: "ready" })
        .where(eq(recordings.id, recording.id));
    }
  }

  return NextResponse.json({ id: recording.id, audioUrl: url });
}
