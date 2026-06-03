import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { putObject } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const form = await req.formData();
  const file = form.get("audio");
  const promptId = String(form.get("promptId") || "");
  const durationMs = Number(form.get("durationMs") || 0);

  if (!(file instanceof Blob) || !promptId)
    return NextResponse.json({ error: "Missing audio or promptId" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024)
    return NextResponse.json({ error: "File too large" }, { status: 413 });

  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt)
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  // must be a speaker (or owner/manager) of the campaign
  const campaign = await prisma.campaign.findUnique({
    where: { id: prompt.campaignId },
  });
  const allowed =
    campaign?.ownerId === userId ||
    (await prisma.membership.findFirst({
      where: {
        campaignId: prompt.campaignId,
        userId,
        role: { in: ["owner", "manager", "speaker"] },
        status: "active",
      },
    }));
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
  const key = `rec/${prompt.campaignId}/${randomBytes(12).toString("hex")}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const url = await putObject(key, buf);

  const recording = await prisma.recording.create({
    data: {
      promptId,
      campaignId: prompt.campaignId,
      speakerId: userId,
      audioUrl: url,
      mimeType: type,
      durationMs: Number.isFinite(durationMs) ? Math.round(durationMs) : 0,
      status: "ready",
    },
  });

  return NextResponse.json({ id: recording.id, audioUrl: url });
}
