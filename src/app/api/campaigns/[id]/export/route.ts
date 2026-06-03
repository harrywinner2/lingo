import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Exports accepted recordings as a JSON manifest (audio URL + prompt + score).
// This is the seed of the training-dataset export described in the v2 plan.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManage =
    (await prisma.campaign.findFirst({
      where: { id, ownerId: session.user.id },
    })) !== null ||
    (await prisma.membership.findFirst({
      where: {
        campaignId: id,
        userId: session.user.id,
        role: { in: ["owner", "manager"] },
      },
    })) !== null;
  if (!canManage)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  const recordings = await prisma.recording.findMany({
    where: { campaignId: id, status: "accepted" },
    include: { prompt: true },
    orderBy: { createdAt: "asc" },
  });

  const origin = new URL(req.url).origin;
  const manifest = {
    campaign: {
      id,
      title: campaign?.title,
      targetLang: campaign?.targetLang,
      pivotLang: campaign?.pivotLang,
    },
    exportedAt: new Date().toISOString(),
    count: recordings.length,
    items: recordings.map((r) => ({
      id: r.id,
      audioUrl: origin + r.audioUrl,
      mimeType: r.mimeType,
      durationMs: r.durationMs,
      score: r.score,
      pivotText: r.prompt.pivotText,
      pivotLang: r.prompt.pivotLang,
      targetLang: r.prompt.targetLang,
      domain: r.prompt.domain,
    })),
  };

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="lingo-${campaign?.targetLang}-${id}.json"`,
    },
  });
}
