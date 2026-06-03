"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, count, sql } from "drizzle-orm";
import {
  getDb,
  campaigns,
  memberships,
  languages,
  prompts,
  invites,
  magicLinks,
  recordings,
  verifications,
  rewards,
  redemptions,
} from "@/db";
import { requireUser } from "@/lib/session";
import { awardPoints, getBalance } from "@/lib/points";
import { slugifyLang } from "@/lib/languages";
import { sendMagicEmail, sendMagicSms } from "@/lib/messaging";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------- helpers ----------

async function assertCampaignRole(
  db: any,
  campaignId: string,
  userId: string,
  roles: string[],
) {
  const c = (
    await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1)
  )[0];
  if (!c) throw new Error("Campaign not found");
  if (c.ownerId === userId) return c;
  const m = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.campaignId, campaignId),
        eq(memberships.userId, userId),
        inArray(memberships.role, roles),
        inArray(memberships.status, ["active", "probation"]),
      ),
    )
    .limit(1);
  if (!m[0]) throw new Error("Not authorized for this campaign");
  return c;
}

function code(len = 8) {
  return randomBytes(16).toString("base64url").slice(0, len);
}

const QUALIFY_ACCEPTED = 2;
const QUALIFY_VERIFS = 5;
const QUALIFY_AGREEMENT = 0.7;

async function evaluateProbation(db: any, campaignId: string, userId: string) {
  const ms = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.campaignId, campaignId),
        eq(memberships.userId, userId),
        eq(memberships.status, "probation"),
      ),
    );
  for (const m of ms) {
    let qualifies = false;
    if (m.role === "speaker") {
      const c = (
        await db
          .select({ c: count() })
          .from(recordings)
          .where(
            and(
              eq(recordings.campaignId, campaignId),
              eq(recordings.speakerId, userId),
              eq(recordings.status, "accepted"),
            ),
          )
      )[0].c;
      qualifies = c >= QUALIFY_ACCEPTED;
    } else if (m.role === "verifier") {
      const vs = await db
        .select({ verdict: verifications.verdict, status: recordings.status })
        .from(verifications)
        .innerJoin(recordings, eq(verifications.recordingId, recordings.id))
        .where(
          and(
            eq(verifications.verifierId, userId),
            eq(recordings.campaignId, campaignId),
            inArray(recordings.status, ["accepted", "rejected"]),
          ),
        );
      if (vs.length >= QUALIFY_VERIFS) {
        const agree = vs.filter(
          (v: any) => (v.verdict !== "incorrect") === (v.status === "accepted"),
        ).length;
        qualifies = agree / vs.length >= QUALIFY_AGREEMENT;
      }
    }
    if (qualifies)
      await db
        .update(memberships)
        .set({ status: "active" })
        .where(eq(memberships.id, m.id));
  }
}

// ---------- campaigns ----------

const campaignSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  targetLang: z.string().min(1),
  targetLangName: z.string().min(1).max(60),
  pivotLang: z.string().min(1).default("en"),
  budgetPoints: z.coerce.number().int().min(0).default(1000),
  rewardRecord: z.coerce.number().int().min(0).default(15),
  rewardVerify: z.coerce.number().int().min(0).default(5),
  minVerifications: z.coerce.number().int().min(1).max(15).default(3),
});

export async function createCampaign(input: z.input<typeof campaignSchema>) {
  const user = await requireUser();
  const data = campaignSchema.parse(input);
  const db = await getDb();
  const c = (await db.insert(campaigns).values({ ...data, ownerId: user.id }).returning())[0];
  await db.insert(memberships).values({
    campaignId: c.id,
    userId: user.id,
    role: "owner",
  });
  redirect(`/app/campaigns/${c.id}`);
}

// ---------- languages ----------

const languageSchema = z.object({
  name: z.string().min(2).max(60),
  countries: z.array(z.string().max(60)).max(60).default([]),
});

export async function createLanguage(input: z.input<typeof languageSchema>) {
  const user = await requireUser();
  const { name, countries } = languageSchema.parse(input);
  const code_ = slugifyLang(name);
  if (!code_) throw new Error("Please enter a valid language name");
  const db = await getDb();
  const existing = (
    await db.select().from(languages).where(eq(languages.code, code_)).limit(1)
  )[0];
  if (existing) {
    await db
      .update(languages)
      .set({ name, countries: countries.join(", ") })
      .where(eq(languages.id, existing.id));
  } else {
    await db.insert(languages).values({
      code: code_,
      name,
      countries: countries.join(", "),
      custom: true,
      createdById: user.id,
    });
  }
  return { code: code_, name };
}

// ---------- prompts ----------

const promptRow = z.object({
  pivotText: z.string().min(1).max(500),
  domain: z.string().max(80).optional().nullable(),
  sceneDescription: z.string().max(500).optional().nullable(),
  difficulty: z.string().max(20).optional().nullable(),
  targetN: z.coerce.number().int().min(1).max(50).optional(),
});

export async function importPrompts(
  campaignId: string,
  rows: z.input<typeof promptRow>[],
) {
  const user = await requireUser();
  const db = await getDb();
  const campaign = await assertCampaignRole(db, campaignId, user.id, [
    "owner",
    "manager",
  ]);
  const clean = rows
    .map((r) => promptRow.safeParse(r))
    .filter((r) => r.success)
    .map((r) => (r as any).data);
  if (clean.length === 0) return { created: 0 };
  await db.insert(prompts).values(
    clean.map((r: any) => ({
      campaignId,
      pivotText: r.pivotText,
      pivotLang: campaign.pivotLang,
      targetLang: campaign.targetLang,
      domain: r.domain ?? null,
      sceneDescription: r.sceneDescription ?? null,
      difficulty: r.difficulty ?? null,
      targetN: r.targetN ?? 3,
      source: "csv",
      createdById: user.id,
    })),
  );
  revalidatePath(`/app/campaigns/${campaignId}/prompts`);
  revalidatePath(`/app/campaigns/${campaignId}`);
  return { created: clean.length };
}

export async function addPrompt(campaignId: string, pivotText: string) {
  const user = await requireUser();
  const db = await getDb();
  const campaign = await assertCampaignRole(db, campaignId, user.id, [
    "owner",
    "manager",
  ]);
  await db.insert(prompts).values({
    campaignId,
    pivotText: pivotText.trim(),
    pivotLang: campaign.pivotLang,
    targetLang: campaign.targetLang,
    source: "manual",
    createdById: user.id,
  });
  revalidatePath(`/app/campaigns/${campaignId}/prompts`);
}

// ---------- invites & membership ----------

export async function createInvite(campaignId: string, role: string) {
  const user = await requireUser();
  const db = await getDb();
  await assertCampaignRole(db, campaignId, user.id, ["owner", "manager"]);
  const code_ = code(8);
  await db
    .insert(invites)
    .values({ campaignId, role, code: code_, createdById: user.id });
  revalidatePath(`/app/campaigns/${campaignId}/members`);
  return code_;
}

async function upsertMembership(
  db: any,
  campaignId: string,
  userId: string,
  role: string,
  status: string,
) {
  const existing = (
    await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.campaignId, campaignId),
          eq(memberships.userId, userId),
          eq(memberships.role, role),
        ),
      )
      .limit(1)
  )[0];
  if (existing) {
    if (existing.status !== status && status === "active")
      await db
        .update(memberships)
        .set({ status })
        .where(eq(memberships.id, existing.id));
  } else {
    await db.insert(memberships).values({ campaignId, userId, role, status });
  }
}

export async function joinByCode(inviteCode: string) {
  const user = await requireUser();
  const db = await getDb();
  const invite = (
    await db.select().from(invites).where(eq(invites.code, inviteCode)).limit(1)
  )[0];
  if (!invite) throw new Error("Invalid invite code");
  if (invite.expiresAt && invite.expiresAt < new Date())
    throw new Error("Invite expired");
  await upsertMembership(db, invite.campaignId, user.id, invite.role, "active");
  redirect(`/app/contribute/${invite.campaignId}`);
}

// ---------- participant import (magic links) ----------

const ROLES = ["speaker", "verifier", "reviewer"];

export async function importParticipants(
  campaignId: string,
  rows: { name?: string | null; contact: string }[],
  role: string,
) {
  const user = await requireUser();
  const db = await getDb();
  const campaign = await assertCampaignRole(db, campaignId, user.id, [
    "owner",
    "manager",
  ]);
  if (!ROLES.includes(role)) throw new Error("Invalid role");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = process.env.APP_URL || (host ? `${proto}://${host}` : "");
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const prepared = rows
    .map((r) => ({ name: r.name?.trim() || null, contact: (r.contact ?? "").trim() }))
    .filter((r) => r.contact.length >= 3)
    .map((r) => ({
      ...r,
      isEmail: r.contact.includes("@"),
      token: randomBytes(18).toString("base64url"),
    }));
  if (prepared.length === 0) return [];

  await db.insert(magicLinks).values(
    prepared.map((p) => ({
      token: p.token,
      campaignId,
      role,
      name: p.name,
      email: p.isEmail ? p.contact.toLowerCase() : null,
      phone: p.isEmail ? null : p.contact,
      createdById: user.id,
      expiresAt,
    })),
  );

  const results = await Promise.all(
    prepared.map(async (p) => {
      const url = `${base}/m/${p.token}`;
      let sent: "email" | "sms" | "failed" | "none" = "none";
      if (p.isEmail) {
        sent = (await sendMagicEmail(p.contact, p.name, campaign.title, url))
          ? "email"
          : process.env.RESEND_API_KEY
            ? "failed"
            : "none";
      } else {
        sent = (await sendMagicSms(p.contact, p.name, campaign.title, url))
          ? "sms"
          : process.env.TWILIO_ACCOUNT_SID
            ? "failed"
            : "none";
      }
      return { name: p.name || p.contact, contact: p.contact, url, sent };
    }),
  );

  revalidatePath(`/app/campaigns/${campaignId}/members`);
  return results;
}

// ---------- open campaigns & onboarding ----------

export async function setCampaignVisibility(
  campaignId: string,
  visibility: "open" | "private",
) {
  const user = await requireUser();
  const db = await getDb();
  await assertCampaignRole(db, campaignId, user.id, ["owner", "manager"]);
  await db.update(campaigns).set({ visibility }).where(eq(campaigns.id, campaignId));
  revalidatePath(`/app/campaigns/${campaignId}`);
}

export async function setAutoQualify(campaignId: string, autoQualify: boolean) {
  const user = await requireUser();
  const db = await getDb();
  await assertCampaignRole(db, campaignId, user.id, ["owner", "manager"]);
  await db.update(campaigns).set({ autoQualify }).where(eq(campaigns.id, campaignId));
  revalidatePath(`/app/campaigns/${campaignId}/members`);
}

export async function requestToJoin(campaignId: string, roles: string[]) {
  const user = await requireUser();
  const db = await getDb();
  const campaign = (
    await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1)
  )[0];
  if (!campaign || campaign.visibility !== "open")
    throw new Error("This campaign isn't open to join");
  const wanted = roles
    .map((r) => (r === "contributor" ? "speaker" : r === "validator" ? "verifier" : r))
    .filter((r) => r === "speaker" || r === "verifier");
  if (wanted.length === 0) throw new Error("Pick at least one role");
  for (const role of wanted)
    await upsertMembership(db, campaignId, user.id, role, "probation");
  redirect(`/app/contribute/${campaignId}`);
}

export async function decideApplicant(
  membershipId: string,
  decision: "approve" | "reject",
) {
  const user = await requireUser();
  const db = await getDb();
  const m = (
    await db.select().from(memberships).where(eq(memberships.id, membershipId)).limit(1)
  )[0];
  if (!m) throw new Error("Applicant not found");
  await assertCampaignRole(db, m.campaignId, user.id, ["owner", "manager"]);
  await db
    .update(memberships)
    .set({ status: decision === "approve" ? "active" : "rejected" })
    .where(eq(memberships.id, membershipId));
  revalidatePath(`/app/campaigns/${m.campaignId}/members`);
}

// ---------- verification ----------

export async function submitVerification(
  recordingId: string,
  verdict: "correct" | "average" | "incorrect",
) {
  const user = await requireUser();
  const db = await getDb();
  const rec = (
    await db.select().from(recordings).where(eq(recordings.id, recordingId)).limit(1)
  )[0];
  if (!rec) throw new Error("Recording not found");
  if (rec.speakerId === user.id)
    throw new Error("You cannot verify your own recording");
  const campaign = await assertCampaignRole(db, rec.campaignId, user.id, [
    "owner",
    "manager",
    "verifier",
    "reviewer",
  ]);

  const existingV = (
    await db
      .select()
      .from(verifications)
      .where(
        and(
          eq(verifications.recordingId, recordingId),
          eq(verifications.verifierId, user.id),
        ),
      )
      .limit(1)
  )[0];
  if (existingV)
    await db
      .update(verifications)
      .set({ verdict })
      .where(eq(verifications.id, existingV.id));
  else
    await db
      .insert(verifications)
      .values({ recordingId, verifierId: user.id, verdict });

  await awardPoints(db, {
    userId: user.id,
    amount: campaign.rewardVerify,
    reason: "verification",
    campaignId: rec.campaignId,
    refId: recordingId,
  });
  await db
    .update(campaigns)
    .set({ spentPoints: sql`${campaigns.spentPoints} + ${campaign.rewardVerify}` })
    .where(eq(campaigns.id, rec.campaignId));

  const verdicts = await db
    .select()
    .from(verifications)
    .where(eq(verifications.recordingId, recordingId));
  if (rec.status === "ready" && verdicts.length >= campaign.minVerifications) {
    const score =
      verdicts.reduce(
        (s: number, v: any) =>
          s + (v.verdict === "correct" ? 1 : v.verdict === "average" ? 0.5 : 0),
        0,
      ) / verdicts.length;
    const accepted = score >= 0.5;
    await db
      .update(recordings)
      .set({ status: accepted ? "accepted" : "rejected", score })
      .where(eq(recordings.id, recordingId));
    if (accepted) {
      const reward = Math.round(campaign.rewardRecord * score);
      await awardPoints(db, {
        userId: rec.speakerId,
        amount: reward,
        reason: "contribution",
        campaignId: rec.campaignId,
        refId: recordingId,
      });
      await db
        .update(campaigns)
        .set({ spentPoints: sql`${campaigns.spentPoints} + ${reward}` })
        .where(eq(campaigns.id, rec.campaignId));
    }
    if (campaign.autoQualify) {
      await evaluateProbation(db, rec.campaignId, rec.speakerId);
      for (const v of verdicts)
        await evaluateProbation(db, rec.campaignId, v.verifierId);
    }
  }

  revalidatePath(`/app/contribute/${rec.campaignId}/verify`);
}

// ---------- rewards ----------

const rewardSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  costPoints: z.coerce.number().int().min(1),
});

export async function createReward(
  campaignId: string,
  input: z.input<typeof rewardSchema>,
) {
  const user = await requireUser();
  const db = await getDb();
  await assertCampaignRole(db, campaignId, user.id, ["owner", "manager"]);
  const data = rewardSchema.parse(input);
  await db.insert(rewards).values({ campaignId, ...data });
  revalidatePath(`/app/campaigns/${campaignId}/rewards`);
}

export async function setRewardActive(rewardId: string, active: boolean) {
  const user = await requireUser();
  const db = await getDb();
  const reward = (
    await db.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1)
  )[0];
  if (!reward) throw new Error("Reward not found");
  await assertCampaignRole(db, reward.campaignId, user.id, ["owner", "manager"]);
  await db.update(rewards).set({ active }).where(eq(rewards.id, rewardId));
  revalidatePath(`/app/campaigns/${reward.campaignId}/rewards`);
}

// ---------- redemptions ----------

export async function redeemReward(rewardId: string) {
  const user = await requireUser();
  const db = await getDb();
  const reward = (
    await db.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1)
  )[0];
  if (!reward || !reward.active) throw new Error("Reward unavailable");
  const campaign = (
    await db.select().from(campaigns).where(eq(campaigns.id, reward.campaignId)).limit(1)
  )[0];

  const member =
    campaign.ownerId === user.id ||
    (
      await db
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.campaignId, reward.campaignId),
            eq(memberships.userId, user.id),
          ),
        )
        .limit(1)
    ).length > 0;
  if (!member) throw new Error("You are not part of this campaign");

  const balance = await getBalance(user.id, reward.campaignId, db);
  if (balance < reward.costPoints)
    throw new Error("Not enough points for this reward");

  const redemption = (
    await db
      .insert(redemptions)
      .values({
        userId: user.id,
        campaignId: reward.campaignId,
        rewardId: reward.id,
        rewardTitle: reward.title,
        points: reward.costPoints,
        status: "open",
      })
      .returning()
  )[0];
  await awardPoints(db, {
    userId: user.id,
    amount: -reward.costPoints,
    reason: "redemption",
    campaignId: reward.campaignId,
    refId: redemption.id,
  });

  revalidatePath(`/app/contribute/${reward.campaignId}/rewards`);
  revalidatePath(`/app/wallet`);
}

export async function markRedeemed(redemptionId: string) {
  const user = await requireUser();
  const db = await getDb();
  const r = (
    await db.select().from(redemptions).where(eq(redemptions.id, redemptionId)).limit(1)
  )[0];
  if (!r) throw new Error("Redemption not found");
  await assertCampaignRole(db, r.campaignId, user.id, ["owner", "manager"]);
  if (r.status !== "open") throw new Error("Already handled");
  await db
    .update(redemptions)
    .set({ status: "redeemed", handledById: user.id, handledAt: new Date() })
    .where(eq(redemptions.id, redemptionId));
  revalidatePath(`/app/campaigns/${r.campaignId}/redemptions`);
}

export async function rejectRedemption(redemptionId: string) {
  const user = await requireUser();
  const db = await getDb();
  const r = (
    await db.select().from(redemptions).where(eq(redemptions.id, redemptionId)).limit(1)
  )[0];
  if (!r) throw new Error("Redemption not found");
  await assertCampaignRole(db, r.campaignId, user.id, ["owner", "manager"]);
  if (r.status !== "open") throw new Error("Already handled");
  await db
    .update(redemptions)
    .set({ status: "rejected", handledById: user.id, handledAt: new Date() })
    .where(eq(redemptions.id, redemptionId));
  await awardPoints(db, {
    userId: r.userId,
    amount: r.points,
    reason: "adjustment",
    campaignId: r.campaignId,
    refId: r.id,
  });
  revalidatePath(`/app/campaigns/${r.campaignId}/redemptions`);
}
