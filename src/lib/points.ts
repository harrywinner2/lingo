import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

type Client = Prisma.TransactionClient | typeof prisma;

/** Balance for a user — across all campaigns, or within one if campaignId given. */
export async function getBalance(
  userId: string,
  campaignId?: string,
  db: Client = prisma,
) {
  const agg = await db.pointLedger.aggregate({
    where: campaignId ? { userId, campaignId } : { userId },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/** Append a ledger entry and return the new balance. Use inside a transaction. */
export async function awardPoints(
  db: Client,
  args: {
    userId: string;
    amount: number;
    reason: string;
    campaignId?: string | null;
    refId?: string | null;
  },
) {
  const balanceAfter =
    (await getBalance(args.userId, args.campaignId ?? undefined, db)) +
    args.amount;
  await db.pointLedger.create({
    data: {
      userId: args.userId,
      amount: args.amount,
      reason: args.reason,
      campaignId: args.campaignId ?? null,
      refId: args.refId ?? null,
      balanceAfter,
    },
  });
  return balanceAfter;
}
