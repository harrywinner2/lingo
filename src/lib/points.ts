import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

type Client = Prisma.TransactionClient | typeof prisma;

export async function getBalance(userId: string, db: Client = prisma) {
  const last = await db.pointLedger.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return last?.balanceAfter ?? 0;
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
  const balance = await getBalance(args.userId, db);
  const balanceAfter = balance + args.amount;
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
