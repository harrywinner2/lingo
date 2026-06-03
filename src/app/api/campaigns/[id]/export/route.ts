import { NextResponse } from "next/server";
import { and, eq, asc } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, campaigns, recordings, prompts } from "@/db";
import { isMember } from "@/lib/membership";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMember(id, session.user.id, ["owner", "manager"])))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getDb();
  const campaign = (
    await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1)
  )[0];
  const rows = await db
    .select({
      id: recordings.id,
      audioUrl: recordings.audioUrl,
      mimeType: recordings.mimeType,
      durationMs: recordings.durationMs,
      score: recordings.score,
      pivotText: prompts.pivotText,
      pivotLang: prompts.pivotLang,
      targetLang: prompts.targetLang,
      domain: prompts.domain,
    })
    .from(recordings)
    .innerJoin(prompts, eq(recordings.promptId, prompts.id))
    .where(and(eq(recordings.campaignId, id), eq(recordings.status, "accepted")))
    .orderBy(asc(recordings.createdAt));

  const origin = new URL(req.url).origin;
  const manifest = {
    campaign: {
      id,
      title: campaign?.title,
      targetLang: campaign?.targetLang,
      pivotLang: campaign?.pivotLang,
    },
    exportedAt: new Date().toISOString(),
    count: rows.length,
    items: rows.map((r: any) => ({ ...r, audioUrl: origin + r.audioUrl })),
  };

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="lingo-${campaign?.targetLang}-${id}.json"`,
    },
  });
}
