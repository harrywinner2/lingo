import { prisma } from "@/lib/prisma";

export async function isMember(
  campaignId: string,
  userId: string,
  roles: string[],
) {
  if (!campaignId) return false;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { ownerId: true },
  });
  if (!campaign) return false;
  if (campaign.ownerId === userId) return true;
  const m = await prisma.membership.findFirst({
    where: {
      campaignId,
      userId,
      role: { in: roles },
      status: { in: ["active", "probation"] },
    },
    select: { id: true },
  });
  return m !== null;
}
