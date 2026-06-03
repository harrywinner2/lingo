"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { awardPoints, getBalance } from "@/lib/points";

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
    where: { campaignId, userId, role: { in: roles }, status: "active" },
  });
  if (!membership) throw new Error("Not authorized for this campaign");
  return campaign;
}

function code(len = 8) {
  return randomBytes(16).toString("base64url").slice(0, len);
}

// ---------- campaigns ----------

const campaignSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  targetLang: z.string().min(1),
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
