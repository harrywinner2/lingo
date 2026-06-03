"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { awardPoints, getBalance } from "@/lib/points";
import { slugifyLang } from "@/lib/languages";
import type { Prisma } from "@/generated/prisma";
import { headers } from "next/headers";
import { sendMagicEmail, sendMagicSms } from "@/lib/messaging";

// ---------- helpers ----------

async function assertCampaignRole(
  campaignId: string,
  userId: string,
  roles: string[],
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.ownerId === userId) return campaign;
  const membership = await prisma.membership.findFirst({
    where: {
      campaignId,
      userId,
      role: { in: roles },
      status: { in: ["active", "probation"] },
    },
  });
  if (!membership) throw new Error("Not authorized for this campaign");
  return campaign;
}

function code(len = 8) {
  return randomBytes(16).toString("base64url").slice(0, len);
}

// Proof-of-work thresholds for auto-qualifying probation members.
const QUALIFY_ACCEPTED = 2; // speaker: accepted recordings
const QUALIFY_VERIFS = 5; // verifier: verdicts on decided clips
const QUALIFY_AGREEMENT = 0.7; // verifier: agreement with consensus

// Promote a probation member to active once their work proves out. Safe to call
// often; only acts on probation memberships that meet the bar.
async function evaluateProbation(
  db: Prisma.TransactionClient,
  campaignId: string,
  userId: string,
) {
  const memberships = await db.membership.findMany({
    where: { campaignId, userId, status: "probation" },
  });
  for (const m of memberships) {
    let qualifies = false;
    if (m.role === "speaker") {
      const accepted = await db.recording.count({
        where: { campaignId, speakerId: userId, status: "accepted" },
      });
      qualifies = accepted >= QUALIFY_ACCEPTED;
    } else if (m.role === "verifier") {
      const vs = await db.verification.findMany({
        where: {
          verifierId: userId,
          recording: { campaignId, status: { in: ["accepted", "rejected"] } },
        },
        include: { recording: { select: { status: true } } },
      });
      if (vs.length >= QUALIFY_VERIFS) {
        const agree = vs.filter(
          (v) => (v.verdict !== "incorrect") === (v.recording.status === "accepted"),
        ).length;
        qualifies = agree / vs.length >= QUALIFY_AGREEMENT;
      }
    }
    if (qualifies)
      await db.membership.update({
        where: { id: m.id },
        data: { status: "active" },
      });
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
  const campaign = await prisma.campaign.create({
    data: {
      ...data,
      ownerId: user.id,
      memberships: { create: { userId: user.id, role: "owner" } },
    },
  });
  redirect(`/app/campaigns/${campaign.id}`);
}

// ---------- languages ----------

const languageSchema = z.object({
  name: z.string().min(2).max(60),
  countries: z.array(z.string().max(60)).max(60).default([]),
});

// Create (or update) a language. A language is just a name + the countries
// where it's spoken — researchers aren't limited to a fixed list.
export async function createLanguage(input: z.input<typeof languageSchema>) {
  const user = await requireUser();
  const { name, countries } = languageSchema.parse(input);
  const code = slugifyLang(name);
  if (!code) throw new Error("Please enter a valid language name");
  const lang = await prisma.language.upsert({
    where: { code },
    update: { name, countries: countries.join(", ") },
    create: {
      code,
      name,
      countries: countries.join(", "),
      custom: true,
      createdById: user.id,
    },
  });
  return { code: lang.code, name: lang.name };
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
  const campaign = await assertCampaignRole(campaignId, user.id, [
    "owner",
    "manager",
  ]);
  const clean = rows
    .map((r) => promptRow.safeParse(r))
    .filter((r) => r.success)
    .map((r) => r.data);
  if (clean.length === 0) return { created: 0 };

  await prisma.prompt.createMany({
    data: clean.map((r) => ({
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
  });
  revalidatePath(`/app/campaigns/${campaignId}/prompts`);
  revalidatePath(`/app/campaigns/${campaignId}`);
  return { created: clean.length };
}

export async function addPrompt(campaignId: string, pivotText: string) {
  const user = await requireUser();
  const campaign = await assertCampaignRole(campaignId, user.id, [
    "owner",
    "manager",
  ]);
  await prisma.prompt.create({
    data: {
      campaignId,
      pivotText: pivotText.trim(),
      pivotLang: campaign.pivotLang,
      targetLang: campaign.targetLang,
      source: "manual",
      createdById: user.id,
    },
  });
  revalidatePath(`/app/campaigns/${campaignId}/prompts`);
}

// ---------- invites & membership ----------

export async function createInvite(campaignId: string, role: string) {
  const user = await requireUser();
  await assertCampaignRole(campaignId, user.id, ["owner", "manager"]);
  const invite = await prisma.invite.create({
    data: { campaignId, role, code: code(8), createdById: user.id },
  });
  revalidatePath(`/app/campaigns/${campaignId}/members`);
  return invite.code;
}

export async function joinByCode(inviteCode: string) {
  const user = await requireUser();
  const invite = await prisma.invite.findUnique({
    where: { code: inviteCode },
  });
  if (!invite) throw new Error("Invalid invite code");
  if (invite.expiresAt && invite.expiresAt < new Date())
    throw new Error("Invite expired");

  await prisma.membership.upsert({
    where: {
      campaignId_userId_role: {
        campaignId: invite.campaignId,
        userId: user.id,
        role: invite.role,
      },
    },
    update: { status: "active" },
    create: { campaignId: invite.campaignId, userId: user.id, role: invite.role },
  });
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
  const campaign = await assertCampaignRole(campaignId, user.id, [
    "owner",
    "manager",
  ]);
  if (!ROLES.includes(role)) throw new Error("Invalid role");

  // Absolute base URL for links sent over email/SMS.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = process.env.APP_URL || (host ? `${proto}://${host}` : "");

  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const prepared = rows
    .map((r) => ({ name: r.name?.trim() || null, contact: (r.contact ?? "").trim() }))
    .filter((r) => r.contact.length >= 3)
    .map((r) => {
      const isEmail = r.contact.includes("@");
      return {
        ...r,
        isEmail,
        token: randomBytes(18).toString("base64url"),
      };
    });

  if (prepared.length === 0) return [];

  await prisma.magicLink.createMany({
    data: prepared.map((p) => ({
      token: p.token,
      campaignId,
      role,
      name: p.name,
      email: p.isEmail ? p.contact.toLowerCase() : null,
      phone: p.isEmail ? null : p.contact,
      createdById: user.id,
      expiresAt,
    })),
  });

  // Send links best-effort, in parallel.
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
  await assertCampaignRole(campaignId, user.id, ["owner", "manager"]);
  await prisma.campaign.update({ where: { id: campaignId }, data: { visibility } });
  revalidatePath(`/app/campaigns/${campaignId}`);
}

export async function setAutoQualify(campaignId: string, autoQualify: boolean) {
  const user = await requireUser();
  await assertCampaignRole(campaignId, user.id, ["owner", "manager"]);
  await prisma.campaign.update({ where: { id: campaignId }, data: { autoQualify } });
  revalidatePath(`/app/campaigns/${campaignId}/members`);
}

// A user asks to join an open campaign. Roles map: contributor->speaker,
// validator->verifier. They join on probation and must prove their work.
export async function requestToJoin(campaignId: string, roles: string[]) {
  const user = await requireUser();
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.visibility !== "open")
    throw new Error("This campaign isn't open to join");
  const wanted = roles
    .map((r) => (r === "contributor" ? "speaker" : r === "validator" ? "verifier" : r))
    .filter((r) => r === "speaker" || r === "verifier");
  if (wanted.length === 0) throw new Error("Pick at least one role");

  for (const role of wanted) {
    await prisma.membership.upsert({
      where: { campaignId_userId_role: { campaignId, userId: user.id, role } },
      update: {},
      create: { campaignId, userId: user.id, role, status: "probation" },
    });
  }
  redirect(`/app/contribute/${campaignId}`);
}

export async function decideApplicant(
  membershipId: string,
  decision: "approve" | "reject",
) {
  const user = await requireUser();
  const m = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!m) throw new Error("Applicant not found");
  await assertCampaignRole(m.campaignId, user.id, ["owner", "manager"]);
  await prisma.membership.update({
    where: { id: membershipId },
    data: { status: decision === "approve" ? "active" : "rejected" },
  });
  revalidatePath(`/app/campaigns/${m.campaignId}/members`);
}

// ---------- verification ----------

export async function submitVerification(
  recordingId: string,
  verdict: "correct" | "average" | "incorrect",
) {
  const user = await requireUser();
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    include: { campaign: true },
  });
  if (!recording) throw new Error("Recording not found");
  if (recording.speakerId === user.id)
    throw new Error("You cannot verify your own recording");

  // must be a verifier (or owner/manager) of the campaign
  await assertCampaignRole(recording.campaignId, user.id, [
    "owner",
    "manager",
    "verifier",
    "reviewer",
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.verification.upsert({
      where: {
        recordingId_verifierId: { recordingId, verifierId: user.id },
      },
      update: { verdict },
      create: { recordingId, verifierId: user.id, verdict },
    });

    // reward the verifier
    await awardPoints(tx, {
      userId: user.id,
      amount: recording.campaign.rewardVerify,
      reason: "verification",
      campaignId: recording.campaignId,
      refId: recordingId,
    });
    await tx.campaign.update({
      where: { id: recording.campaignId },
      data: { spentPoints: { increment: recording.campaign.rewardVerify } },
    });

    // decide the recording once enough verdicts are in
    const verdicts = await tx.verification.findMany({ where: { recordingId } });
    if (
      recording.status === "ready" &&
      verdicts.length >= recording.campaign.minVerifications
    ) {
      const score =
        verdicts.reduce(
          (s, v) =>
            s + (v.verdict === "correct" ? 1 : v.verdict === "average" ? 0.5 : 0),
          0,
        ) / verdicts.length;
      const accepted = score >= 0.5;
      await tx.recording.update({
        where: { id: recordingId },
        data: { status: accepted ? "accepted" : "rejected", score },
      });
      if (accepted) {
        // quality-weighted reward to the speaker
        const reward = Math.round(recording.campaign.rewardRecord * score);
        await awardPoints(tx, {
          userId: recording.speakerId,
          amount: reward,
          reason: "contribution",
          campaignId: recording.campaignId,
          refId: recordingId,
        });
        await tx.campaign.update({
          where: { id: recording.campaignId },
          data: { spentPoints: { increment: reward } },
        });
      }

      // proof-of-work: maybe promote probation members involved in this clip
      if (recording.campaign.autoQualify) {
        await evaluateProbation(tx, recording.campaignId, recording.speakerId);
        for (const v of verdicts)
          await evaluateProbation(tx, recording.campaignId, v.verifierId);
      }
    }
  });

  revalidatePath(`/app/contribute/${recording.campaignId}/verify`);
}

// ---------- rewards (researcher-defined catalog) ----------

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
  await assertCampaignRole(campaignId, user.id, ["owner", "manager"]);
  const data = rewardSchema.parse(input);
  await prisma.reward.create({ data: { campaignId, ...data } });
  revalidatePath(`/app/campaigns/${campaignId}/rewards`);
}

export async function setRewardActive(rewardId: string, active: boolean) {
  const user = await requireUser();
  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward) throw new Error("Reward not found");
  await assertCampaignRole(reward.campaignId, user.id, ["owner", "manager"]);
  await prisma.reward.update({ where: { id: rewardId }, data: { active } });
  revalidatePath(`/app/campaigns/${reward.campaignId}/rewards`);
}

// ---------- redemptions ----------

// Contributor redeems a reward — points are deducted immediately and a
// redemption is opened for the researcher to fulfil out-of-band.
export async function redeemReward(rewardId: string) {
  const user = await requireUser();
  const reward = await prisma.reward.findUnique({
    where: { id: rewardId },
    include: { campaign: true },
  });
  if (!reward || !reward.active) throw new Error("Reward unavailable");

  const member =
    reward.campaign.ownerId === user.id ||
    (await prisma.membership.findFirst({
      where: { campaignId: reward.campaignId, userId: user.id, status: "active" },
    })) !== null;
  if (!member) throw new Error("You are not part of this campaign");

  await prisma.$transaction(async (tx) => {
    const balance = await getBalance(user.id, reward.campaignId, tx);
    if (balance < reward.costPoints)
      throw new Error("Not enough points for this reward");

    const redemption = await tx.redemption.create({
      data: {
        userId: user.id,
        campaignId: reward.campaignId,
        rewardId: reward.id,
        rewardTitle: reward.title,
        points: reward.costPoints,
        status: "open",
      },
    });
    await awardPoints(tx, {
      userId: user.id,
      amount: -reward.costPoints,
      reason: "redemption",
      campaignId: reward.campaignId,
      refId: redemption.id,
    });
  });

  revalidatePath(`/app/contribute/${reward.campaignId}/rewards`);
  revalidatePath(`/app/wallet`);
}

export async function markRedeemed(redemptionId: string) {
  const user = await requireUser();
  const r = await prisma.redemption.findUnique({ where: { id: redemptionId } });
  if (!r) throw new Error("Redemption not found");
  await assertCampaignRole(r.campaignId, user.id, ["owner", "manager"]);
  if (r.status !== "open") throw new Error("Already handled");
  await prisma.redemption.update({
    where: { id: redemptionId },
    data: { status: "redeemed", handledById: user.id, handledAt: new Date() },
  });
  revalidatePath(`/app/campaigns/${r.campaignId}/redemptions`);
}

// Reject an open redemption and refund the points to the contributor.
export async function rejectRedemption(redemptionId: string) {
  const user = await requireUser();
  const r = await prisma.redemption.findUnique({ where: { id: redemptionId } });
  if (!r) throw new Error("Redemption not found");
  await assertCampaignRole(r.campaignId, user.id, ["owner", "manager"]);
  if (r.status !== "open") throw new Error("Already handled");
  await prisma.$transaction(async (tx) => {
    await tx.redemption.update({
      where: { id: redemptionId },
      data: { status: "rejected", handledById: user.id, handledAt: new Date() },
    });
    await awardPoints(tx, {
      userId: r.userId,
      amount: r.points,
      reason: "adjustment",
      campaignId: r.campaignId,
      refId: r.id,
    });
  });
  revalidatePath(`/app/campaigns/${r.campaignId}/redemptions`);
}
