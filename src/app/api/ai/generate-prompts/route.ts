import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, campaigns, languages } from "@/db";
import { isMember } from "@/lib/membership";
import {
  generatePrompts,
  isAiConfigured,
  AiNotConfiguredError,
} from "@/lib/ai-prompts";

const bodySchema = z.object({
  campaignId: z.string().min(1),
  topic: z.string().max(200).optional(),
  count: z.coerce.number().int().min(1).max(30).optional(),
  locale: z.string().max(10).optional(),
});

export async function POST(req: Request) {
  // Inert until the credential is set.
  if (!isAiConfigured())
    return NextResponse.json(
      { error: "AI authoring not configured" },
      { status: 503 },
    );

  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { campaignId, topic, count, locale } = parsed.data;

  // Only campaign owners/managers may author prompts.
  if (!(await isMember(campaignId, session.user.id, ["owner", "manager"])))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getDb();
  const campaign = (
    await db
      .select({
        targetLang: campaigns.targetLang,
        targetLangName: campaigns.targetLangName,
      })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1)
  )[0];
  if (!campaign)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve a human language name + the region context for cultural adaptation.
  const lang = (
    await db
      .select({ name: languages.name, countries: languages.countries })
      .from(languages)
      .where(eq(languages.code, campaign.targetLang))
      .limit(1)
  )[0];

  const language =
    campaign.targetLangName || lang?.name || campaign.targetLang;
  const countries = lang?.countries || "";

  try {
    const prompts = await generatePrompts({
      language,
      countries,
      topic,
      count,
      locale,
    });
    return NextResponse.json({ prompts });
  } catch (e) {
    if (e instanceof AiNotConfiguredError)
      return NextResponse.json(
        { error: "AI authoring not configured" },
        { status: 503 },
      );
    const msg = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
