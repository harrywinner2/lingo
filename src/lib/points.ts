import { getDb, pointLedger } from "@/db";
import { and, eq, sql } from "drizzle-orm";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Balance for a user — across all campaigns, or within one if campaignId given. */
export async function getBalance(
  userId: string,
  campaignId?: string,
  db?: any,
) {
  const database = db ?? (await getDb());
  const where = campaignId
    ? and(eq(pointLedger.userId, userId), eq(pointLedger.campaignId, campaignId))
    : eq(pointLedger.userId, userId);
  const rows = await database
    .select({ s: sql<number>`COALESCE(SUM(${pointLedger.amount}), 0)` })
    .from(pointLedger)
    .where(where);
  return Number(rows[0]?.s ?? 0);
}

/** Append a ledger entry and return the new balance. (D1 has no interactive
 *  transactions, so writes are sequential — acceptable at this scale.) */
export async function awardPoints(
  db: any,
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
  await db.insert(pointLedger).values({
    userId: args.userId,
    amount: args.amount,
    reason: args.reason,
    campaignId: args.campaignId ?? null,
    refId: args.refId ?? null,
    balanceAfter,
  });
  return balanceAfter;
}
