import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Coins } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isMember } from "@/lib/membership";
import { getBalance } from "@/lib/points";
import { Card, Badge } from "@/components/ui/primitives";
import { RedeemButton } from "@/components/redeem-button";
import { formatPoints, timeAgo } from "@/lib/utils";

export default async function ContributorRewardsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const user = await requireUser();
  if (
    !(await isMember(campaignId, user.id, [
      "owner",
      "manager",
      "speaker",
      "verifier",
      "reviewer",
    ]))
  )
    notFound();

  const [campaign, balance, rewards, myRedemptions] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId } }),
    getBalance(user.id, campaignId),
    prisma.reward.findMany({
      where: { campaignId, active: true },
      orderBy: { costPoints: "asc" },
    }),
    prisma.redemption.findMany({
      where: { campaignId, userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  if (!campaign) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link
        href={`/app/contribute/${campaignId}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <Card className="flex items-center justify-between bg-ink p-5 text-paper">
        <div>
          <p className="text-sm font-medium text-paper/70">
            Your points in {campaign.title}
          </p>
          <p className="font-display text-3xl font-semibold">
            {formatPoints(balance)}
          </p>
        </div>
        <Coins className="h-10 w-10 text-primary" />
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Rewards</h2>
        {rewards.length === 0 ? (
          <Card className="p-8 text-center text-muted">
            The researcher hasn&apos;t added any rewards yet.
          </Card>
        ) : (
          <div className="space-y-2">
            {rewards.map((r) => {
              const affordable = balance >= r.costPoints;
              return (
                <Card key={r.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted">
                      {formatPoints(r.costPoints)} pts
                      {r.description ? ` · ${r.description}` : ""}
                    </p>
                  </div>
                  <RedeemButton rewardId={r.id} disabled={!affordable} />
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {myRedemptions.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Your redemptions</h2>
          <div className="space-y-2">
            {myRedemptions.map((r) => (
              <Card key={r.id} className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-sm font-medium">{r.rewardTitle}</p>
                  <p className="text-xs text-muted">{timeAgo(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {formatPoints(r.points)} pts
                  </span>
                  <Badge
                    tone={
                      r.status === "redeemed"
                        ? "success"
                        : r.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {r.status === "open" ? "pending" : r.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
