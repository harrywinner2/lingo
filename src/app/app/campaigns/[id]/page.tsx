import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Users, Download, Mic, Gift, Wallet } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { langName } from "@/lib/languages";
import { formatPoints } from "@/lib/utils";

export default async function CampaignOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      _count: { select: { prompts: true, recordings: true, memberships: true } },
    },
  });
  if (!campaign) notFound();

  const canManage =
    campaign.ownerId === user.id ||
    (await prisma.membership.findFirst({
      where: { campaignId: id, userId: user.id, role: { in: ["owner", "manager"] } },
    })) !== null;
  if (!canManage) notFound();

  const [accepted, ready] = await Promise.all([
    prisma.recording.count({ where: { campaignId: id, status: "accepted" } }),
    prisma.recording.count({ where: { campaignId: id, status: "ready" } }),
  ]);

  const pct = campaign.budgetPoints
    ? Math.min(100, Math.round((campaign.spentPoints / campaign.budgetPoints) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <Link
        href="/app/campaigns"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Campaigns
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {campaign.title}
            </h1>
            <Badge tone={campaign.status === "active" ? "success" : "neutral"}>
              {campaign.status}
            </Badge>
          </div>
          <p className="mt-1 text-muted">
            {langName(campaign.targetLang)} · prompts shown in{" "}
            {langName(campaign.pivotLang)}
          </p>
          {campaign.description && (
            <p className="mt-3 max-w-2xl text-sm text-muted">
              {campaign.description}
            </p>
          )}
        </div>
        <a href={`/api/campaigns/${id}/export`}>
          <Button variant="outline">
            <Download className="h-4 w-4" /> Export dataset
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Prompts" value={campaign._count.prompts} />
        <Metric label="Recordings" value={campaign._count.recordings} />
        <Metric label="Accepted" value={accepted} />
        <Metric label="Awaiting review" value={ready} />
      </div>

      <Card className="p-5">
        <div className="mb-1.5 flex justify-between text-sm font-medium">
          <span>Budget spent</span>
          <span className="text-muted">
            {formatPoints(campaign.spentPoints)} /{" "}
            {formatPoints(campaign.budgetPoints)} pts
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard
          href={`/app/campaigns/${id}/prompts`}
          icon={FileText}
          title="Prompts"
          desc="Import CSV & manage"
        />
        <NavCard
          href={`/app/campaigns/${id}/members`}
          icon={Users}
          title="People"
          desc="Invite by role"
        />
        <NavCard
          href={`/app/campaigns/${id}/rewards`}
          icon={Gift}
          title="Rewards"
          desc="What points buy"
        />
        <NavCard
          href={`/app/campaigns/${id}/redemptions`}
          icon={Wallet}
          title="Redemptions"
          desc="Fulfil & track"
        />
        <NavCard
          href={`/app/contribute/${id}`}
          icon={Mic}
          title="Contribute"
          desc="Record & verify"
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="font-display text-2xl font-semibold">{value}</p>
      <p className="text-xs font-medium text-muted">{label}</p>
    </Card>
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="flex items-center gap-3 p-4 transition hover:shadow-lift">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/5">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted">{desc}</p>
        </div>
      </Card>
    </Link>
  );
}
