import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
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

  const rewards = await prisma.reward.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });

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
