import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isMember } from "@/lib/membership";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { RedemptionActions } from "@/components/redemption-actions";
import { formatPoints, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function RedemptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  const view = status === "history" ? "history" : "open";
  const user = await requireUser();
  if (!(await isMember(id, user.id, ["owner", "manager"]))) notFound();

  const where =
    view === "open"
      ? { campaignId: id, status: "open" }
      : { campaignId: id, status: { in: ["redeemed", "rejected"] } };

  const [redemptions, openCount] = await Promise.all([
    prisma.redemption.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.redemption.count({ where: { campaignId: id, status: "open" } }),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href={`/app/campaigns/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Campaign
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Redemptions
          </h1>
          <p className="mt-1 text-muted">
            Fulfil each request out-of-band, then mark it redeemed.
          </p>
        </div>
        <a href={`/api/campaigns/${id}/redemptions/export?status=${view === "open" ? "open" : "history"}`}>
          <Button variant="outline">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </a>
      </div>

      <div className="flex gap-1 rounded-xl border border-line bg-card p-1">
        <Tab href={`/app/campaigns/${id}/redemptions?status=open`} active={view === "open"}>
          Open{openCount > 0 ? ` (${openCount})` : ""}
        </Tab>
        <Tab href={`/app/campaigns/${id}/redemptions?status=history`} active={view === "history"}>
          History
        </Tab>
      </div>

      {redemptions.length === 0 ? (
        <Card className="p-10 text-center text-muted">
          {view === "open"
            ? "No open redemptions right now."
            : "No completed redemptions yet."}
        </Card>
      ) : (
        <div className="space-y-2">
          {redemptions.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-paper">
                {(r.user.name || r.user.email || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {r.user.name || r.user.email}
                </p>
                <p className="truncate text-xs text-muted">
                  {r.rewardTitle ?? "Reward"} · {timeAgo(r.createdAt)}
                </p>
              </div>
              <span className="font-semibold">{formatPoints(r.points)} pts</span>
              {view === "open" ? (
                <RedemptionActions id={r.id} />
              ) : (
                <Badge tone={r.status === "redeemed" ? "success" : "danger"}>
                  {r.status}
                </Badge>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold transition",
        active ? "bg-ink text-paper" : "text-muted hover:bg-black/5",
      )}
    >
      {children}
    </Link>
  );
}
