import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/primitives";
import { langName } from "@/lib/languages";
import { formatPoints } from "@/lib/utils";

export default async function CampaignsPage() {
  const user = await requireUser();
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, role: { in: ["owner", "manager"] } },
    include: {
      campaign: {
        include: { _count: { select: { prompts: true, recordings: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const campaigns = memberships.map((m) => ({ ...m.campaign, myRole: m.role }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Campaigns
          </h1>
          <p className="mt-1 text-muted">Collections you manage.</p>
        </div>
        <Link href="/app/campaigns/new">
          <Button>
            <Plus className="h-4 w-4" /> New
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Megaphone className="h-9 w-9 text-muted" />
          <p className="font-semibold">No campaigns yet</p>
          <p className="max-w-sm text-sm text-muted">
            A campaign defines a target language, prompts, a points budget, and
            the people contributing.
          </p>
          <Link href="/app/campaigns/new">
            <Button>
              <Plus className="h-4 w-4" /> Create your first campaign
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {campaigns.map((c) => {
            const pct = c.budgetPoints
              ? Math.min(100, Math.round((c.spentPoints / c.budgetPoints) * 100))
              : 0;
            return (
              <Link key={c.id} href={`/app/campaigns/${c.id}`}>
                <Card className="p-5 transition hover:shadow-lift">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{c.title}</h3>
                      <p className="mt-0.5 text-sm text-muted">
                        {c.targetLangName ?? langName(c.targetLang)}
                      </p>
                    </div>
                    <Badge tone={c.status === "active" ? "success" : "neutral"}>
                      {c.status}
                    </Badge>
                  </div>
                  <div className="mt-4 flex gap-4 text-sm text-muted">
                    <span>{c._count.prompts} prompts</span>
                    <span>{c._count.recordings} recordings</span>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>Budget</span>
                      <span>
                        {formatPoints(c.spentPoints)} /{" "}
                        {formatPoints(c.budgetPoints)} pts
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
