import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMember } from "@/lib/membership";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const campaignId = new URL(req.url).searchParams.get("campaignId") || "";

  if (
    !(await isMember(campaignId, userId, [
      "owner",
      "manager",
      "verifier",
      "reviewer",
    ]))
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const next = await prisma.recording.findFirst({
    where: {
      campaignId,
      status: "ready",
      speakerId: { not: userId },
      verifications: { none: { verifierId: userId } },
    },
    include: { prompt: true },
    orderBy: { createdAt: "asc" },
  });

  const remaining = await prisma.recording.count({
    where: {
      campaignId,
      status: "ready",
      speakerId: { not: userId },
      verifications: { none: { verifierId: userId } },
    },
  });

  if (!next) return NextResponse.json({ task: null, remaining: 0 });
  return NextResponse.json({
    task: {
      recordingId: next.id,
      audioUrl: next.audioUrl,
      pivotText: next.prompt.pivotText,
      pivotLang: next.prompt.pivotLang,
      targetLang: next.prompt.targetLang,
    },
    remaining,
  });
}
