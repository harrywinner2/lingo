import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMember } from "@/lib/membership";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const params = new URL(req.url).searchParams;
  const campaignId = params.get("campaignId") || "";
  const exclude = (params.get("exclude") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!(await isMember(campaignId, userId, ["owner", "manager", "speaker"])))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // prompts this user hasn't recorded, least-covered first
  const candidates = await prisma.prompt.findMany({
    where: {
      campaignId,
      status: "live",
      recordings: { none: { speakerId: userId } },
      ...(exclude.length ? { id: { notIn: exclude } } : {}),
    },
    include: { _count: { select: { recordings: true } } },
    orderBy: { recordings: { _count: "asc" } },
    take: 25,
  });
  const next = candidates.find((p) => p._count.recordings < p.targetN);
  const remaining = candidates.filter(
    (p) => p._count.recordings < p.targetN,
  ).length;

  if (!next) return NextResponse.json({ prompt: null, remaining: 0 });
  return NextResponse.json({
    prompt: {
      id: next.id,
      pivotText: next.pivotText,
      pivotLang: next.pivotLang,
      targetLang: next.targetLang,
      domain: next.domain,
      sceneDescription: next.sceneDescription,
      imageUrl: next.imageUrl,
    },
    remaining,
  });
}
