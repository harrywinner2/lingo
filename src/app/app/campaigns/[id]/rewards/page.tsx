import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { eq, desc, count, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/session";
import { getDb, rewards as rewardsTable, redemptions } from "@/db";
import { isMember } from "@/lib/membership";
import { RewardManager } from "@/components/reward-manager";

export default async function RewardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!(await isMember(id, user.id, ["owner", "manager"]))) notFound();

  const db = await getDb();
  const rows = await db
    .select()
    .from(rewardsTable)
    .where(eq(rewardsTable.campaignId, id))
    .orderBy(desc(rewardsTable.createdAt));
  const ids = rows.map((r: any) => r.id);
  const redc = new Map<string, number>();
  if (ids.length)
    for (const x of await db
      .select({ rid: redemptions.rewardId, c: count() })
      .from(redemptions)
      .where(inArray(redemptions.rewardId, ids))
      .groupBy(redemptions.rewardId))
      redc.set((x as any).rid, Number((x as any).c));
  const rewards = rows.map((r: any) => ({
    ...r,
    _count: { redemptions: redc.get(r.id) ?? 0 },
  }));

  return (
    <div className="space-y-6">
      <Link
        href={`/app/campaigns/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Campaign
      </Link>

      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Rewards
        </h1>
        <p className="mt-1 text-muted">
          Define what contributors can redeem their points for. You fulfil each
          redemption out-of-band, the way you agreed with them.
        </p>
      </div>

      <RewardManager
        campaignId={id}
        rewards={rewards.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          costPoints: r.costPoints,
          active: r.active,
          redemptions: r._count.redemptions,
        }))}
      />
    </div>
  );
}
