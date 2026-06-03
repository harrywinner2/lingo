import { Compass } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { JoinOpenCampaign } from "@/components/join-open-campaign";
import { langName } from "@/lib/languages";

export default async function DiscoverPage() {
  const user = await requireUser();

  const myMemberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { campaignId: true },
  });
  const mine = new Set(myMemberships.map((m) => m.campaignId));

  const open = await prisma.campaign.findMany({
    where: { visibility: "open", status: { in: ["active", "draft", "paused"] } },
    include: { _count: { select: { prompts: true, recordings: true } } },
    orderBy: { createdAt: "desc" },
  });
  const joinable = open.filter((c) => !mine.has(c.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Discover
        </h1>
        <p className="mt-1 text-muted">
          Open campaigns you can join. You&apos;ll start on probation and qualify
          by doing a little test work.
        </p>
      </div>

      {joinable.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Compass className="h-9 w-9 text-muted" />
          <p className="font-semibold">No open campaigns right now</p>
          <p className="max-w-sm text-sm text-muted">
            Check back later, or ask a researcher for an invite link.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {joinable.map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="mt-0.5 text-sm text-muted">
                    {c.targetLangName ?? langName(c.targetLang)}
                  </p>
                </div>
                <Badge tone="accent">open</Badge>
              </div>
              {c.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted">
                  {c.description}
                </p>
              )}
              <p className="mt-2 text-xs text-muted">
                {c._count.prompts} prompts · {c._count.recordings} recordings
              </p>
              <div className="mt-4">
                <JoinOpenCampaign campaignId={c.id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
