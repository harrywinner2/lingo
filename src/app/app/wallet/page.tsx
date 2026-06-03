import { Coins, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/points";
import { Card, Badge } from "@/components/ui/primitives";
import { RedeemForm } from "@/components/redeem-form";
import { formatPoints, timeAgo } from "@/lib/utils";

const REASON_LABEL: Record<string, string> = {
  contribution: "Recording accepted",
  verification: "Verification",
  quality_bonus: "Quality bonus",
  redemption: "Redemption",
  adjustment: "Adjustment",
};

export default async function WalletPage() {
  const user = await requireUser();
  const [balance, ledger, redemptions] = await Promise.all([
    getBalance(user.id),
    prisma.pointLedger.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.redemption.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Wallet
        </h1>
        <p className="mt-1 text-muted">
          Points you&apos;ve earned, and how to redeem them.
        </p>
      </div>

      <Card className="flex items-center justify-between bg-ink p-6 text-paper">
        <div>
          <p className="text-sm font-medium text-paper/70">Balance</p>
          <p className="font-display text-4xl font-semibold">
            {formatPoints(balance)}
          </p>
        </div>
        <Coins className="h-12 w-12 text-primary" />
      </Card>

      <RedeemForm balance={balance} />

      {redemptions.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Redemption requests</h2>
          <div className="space-y-2">
            {redemptions.map((r) => (
              <Card
                key={r.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="font-medium capitalize">
                    {r.method.replace("_", " ")}
                  </p>
                  <p className="text-xs text-muted">{timeAgo(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {formatPoints(r.points)} pts
                  </span>
                  <Badge
                    tone={
                      r.status === "paid"
                        ? "success"
                        : r.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {r.status}
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
