import Link from "next/link";
import { Coins, ArrowDownRight, ArrowUpRight, Gift } from "lucide-react";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/session";
import {
  getDb,
  memberships as membershipsTable,
  pointLedger,
  redemptions as redemptionsTable,
} from "@/db";
import { getBalance } from "@/lib/points";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { langName } from "@/lib/languages";
import { formatPoints, timeAgo } from "@/lib/utils";

const REASON_LABEL: Record<string, string> = {
  contribution: "Recording accepted",
  verification: "Verification",
  quality_bonus: "Quality bonus",
  redemption: "Redeemed reward",
  adjustment: "Refund / adjustment",
};

export default async function WalletPage() {
  const user = await requireUser();

  const db = await getDb();
  const memberships = await db.query.memberships.findMany({
    where: eq(membershipsTable.userId, user.id),
    with: { campaign: true },
  });
  const campaigns = [
    ...new Map(memberships.map((m: any) => [m.campaignId, m.campaign])).values(),
  ] as any[];

  const [total, perCampaign, ledger, redemptions] = await Promise.all([
    getBalance(user.id),
    Promise.all(
      campaigns.map(async (c: any) => ({
        campaign: c,
        balance: await getBalance(user.id, c.id),
      })),
    ),
    db
      .select()
      .from(pointLedger)
      .where(eq(pointLedger.userId, user.id))
      .orderBy(desc(pointLedger.createdAt))
      .limit(50),
    db
      .select()
      .from(redemptionsTable)
      .where(eq(redemptionsTable.userId, user.id))
      .orderBy(desc(redemptionsTable.createdAt))
      .limit(10),
  ]);

  const withBalance = perCampaign.filter((c) => c.balance > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Wallet
        </h1>
        <p className="mt-1 text-muted">
          Points are earned and redeemed within each campaign.
        </p>
      </div>

      <Card className="flex items-center justify-between bg-ink p-6 text-paper">
        <div>
          <p className="text-sm font-medium text-paper/70">Total points</p>
          <p className="font-display text-4xl font-semibold">
            {formatPoints(total)}
          </p>
        </div>
        <Coins className="h-12 w-12 text-primary" />
      </Card>

      {withBalance.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Redeem by campaign</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {withBalance.map(({ campaign, balance }) => (
              <Card key={campaign.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{campaign.title}</p>
                  <p className="text-sm text-muted">
                    {campaign.targetLangName ?? langName(campaign.targetLang)} · {formatPoints(balance)} pts
                  </p>
                </div>
                <Link href={`/app/contribute/${campaign.id}/rewards`}>
                  <Button size="sm" variant="outline">
                    <Gift className="h-4 w-4" /> Redeem
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {redemptions.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Your redemptions</h2>
          <div className="space-y-2">
            {redemptions.map((r) => (
              <Card key={r.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{r.rewardTitle ?? "Reward"}</p>
                  <p className="text-xs text-muted">{timeAgo(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
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
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Activity</h2>
        {ledger.length === 0 ? (
          <Card className="p-8 text-center text-muted">
            No activity yet — record or verify to start earning.
          </Card>
        ) : (
          <div className="space-y-2">
            {ledger.map((e) => (
              <Card key={e.id} className="flex items-center gap-3 p-4">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
                    e.amount >= 0
                      ? "bg-success/12 text-success"
                      : "bg-danger/12 text-danger"
                  }`}
                >
                  {e.amount >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {REASON_LABEL[e.reason] ?? e.reason}
                  </p>
                  <p className="text-xs text-muted">{timeAgo(e.createdAt)}</p>
                </div>
                <span
                  className={`font-semibold ${
                    e.amount >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {e.amount >= 0 ? "+" : ""}
                  {formatPoints(e.amount)}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
