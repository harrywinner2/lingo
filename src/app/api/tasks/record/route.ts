import { NextResponse } from "next/server";
import { and, eq, count } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, prompts, recordings, campaigns } from "@/db";
import { isMember } from "@/lib/membership";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const params = new URL(req.url).searchParams;
  const campaignId = params.get("campaignId") || "";
  const exclude = (params.get("exclude") || "").split(",").map((s) => s.trim()).filter(Boolean);

  if (!(await isMember(campaignId, userId, ["owner", "manager", "speaker"])))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getDb();
  const live = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.campaignId, campaignId), eq(prompts.status, "live")));

  const counts = await db
    .select({ promptId: recordings.promptId, c: count() })
    .from(recordings)
    .where(eq(recordings.campaignId, campaignId))
    .groupBy(recordings.promptId);
  const countMap = new Map<string, number>(
    counts.map((r: any) => [r.promptId, Number(r.c)]),
  );

  const mine = new Set(
    (
      await db
        .select({ promptId: recordings.promptId })
        .from(recordings)
        .where(
          and(eq(recordings.campaignId, campaignId), eq(recordings.speakerId, userId)),
        )
    ).map((r: any) => r.promptId),
  );

  const candidates = live
    .filter((p: any) => !mine.has(p.id) && !exclude.includes(p.id))
    .map((p: any) => ({ p, c: countMap.get(p.id) ?? 0 }))
    .filter((x: any) => x.c < x.p.targetN)
    .sort((a: any, b: any) => a.c - b.c);

  const next = candidates[0]?.p;
  if (!next) return NextResponse.json({ prompt: null, remaining: 0 });

  const campaign = (
    await db
      .select({ targetLangName: campaigns.targetLangName })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1)
  )[0];

  return NextResponse.json({
    prompt: {
      id: next.id,
      pivotText: next.pivotText,
      pivotLang: next.pivotLang,
      targetLang: next.targetLang,
      targetLangName: campaign?.targetLangName ?? null,
      domain: next.domain,
      sceneDescription: next.sceneDescription,
      imageUrl: next.imageUrl,
    },
    remaining: candidates.length,
  });
}
