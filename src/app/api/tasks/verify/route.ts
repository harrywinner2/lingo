import { NextResponse } from "next/server";
import { and, eq, ne, asc } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, recordings, verifications, prompts, campaigns } from "@/db";
import { isMember } from "@/lib/membership";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const params = new URL(req.url).searchParams;
  const campaignId = params.get("campaignId") || "";
  const exclude = (params.get("exclude") || "").split(",").map((s) => s.trim()).filter(Boolean);

  if (!(await isMember(campaignId, userId, ["owner", "manager", "verifier", "reviewer"])))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getDb();
  const verified = new Set(
    (
      await db
        .select({ rid: verifications.recordingId })
        .from(verifications)
        .where(eq(verifications.verifierId, userId))
    ).map((r: any) => r.rid),
  );

  const ready = await db
    .select()
    .from(recordings)
    .where(
      and(
        eq(recordings.campaignId, campaignId),
        eq(recordings.status, "ready"),
        ne(recordings.speakerId, userId),
      ),
    )
    .orderBy(asc(recordings.createdAt));

  const avail = ready.filter(
    (r: any) => !verified.has(r.id) && !exclude.includes(r.id),
  );
  const next = avail[0];
  if (!next) return NextResponse.json({ task: null, remaining: 0 });

  const prompt = (
    await db.select().from(prompts).where(eq(prompts.id, next.promptId)).limit(1)
  )[0];
  const campaign = (
    await db
      .select({ targetLangName: campaigns.targetLangName })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1)
  )[0];

  return NextResponse.json({
    task: {
      recordingId: next.id,
      audioUrl: next.audioUrl,
      pivotText: prompt.pivotText,
      pivotLang: prompt.pivotLang,
      targetLang: prompt.targetLang,
      targetLangName: campaign?.targetLangName ?? null,
    },
    remaining: avail.length,
  });
}
