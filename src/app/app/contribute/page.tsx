import Link from "next/link";
import { Mic } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { langName } from "@/lib/languages";

export default async function ContributePage() {
  const user = await requireUser();
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { campaign: true },
    orderBy: { createdAt: "desc" },
  });

  // group roles per campaign
  const byCampaign = new Map<
    string,
    { campaign: (typeof memberships)[number]["campaign"]; roles: string[] }
  >();
  for (const m of memberships) {
    const entry = byCampaign.get(m.campaignId) ?? {
      campaign: m.campaign,
      roles: [],
    };
    entry.roles.push(m.role);
    byCampaign.set(m.campaignId, entry);
  }
  const list = [...byCampaign.values()].filter((e) =>
    e.campaign.status !== "closed",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Contribute
        </h1>
        <p className="mt-1 text-muted">
          Pick a campaign to record phrases or verify others.
        </p>
      </div>

      {list.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Mic className="h-9 w-9 text-muted" />
          <p className="font-semibold">No campaigns to contribute to yet</p>
          <p className="max-w-sm text-sm text-muted">
            Open an invite link from a researcher to join one — or create your
            own campaign.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map(({ campaign, roles }) => (
            <Link key={campaign.id} href={`/app/contribute/${campaign.id}`}>
              <Card className="p-5 transition hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{campaign.title}</h3>
                    <p className="mt-0.5 text-sm text-muted">
                      {langName(campaign.targetLang)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[...new Set(roles)].map((r) => (
                    <Badge key={r} tone="primary">
                      {r}
                    </Badge>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
