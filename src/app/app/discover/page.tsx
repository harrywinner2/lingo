import { and, eq, inArray, desc, count } from "drizzle-orm";
import { Compass } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getDb, memberships, campaigns, prompts, recordings } from "@/db";
import { Card, Badge } from "@/components/ui/primitives";
import { JoinOpenCampaign } from "@/components/join-open-campaign";
import { langName } from "@/lib/languages";

export default async function DiscoverPage() {
  const user = await requireUser();
  const db = await getDb();

  const mine = new Set(
    (
      await db
        .select({ campaignId: memberships.campaignId })
        .from(memberships)
        .where(eq(memberships.userId, user.id))
    ).map((m: any) => m.campaignId),
  );

  const open = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.visibility, "open"),
        inArray(campaigns.status, ["active", "draft", "paused"]),
      ),
    )
    .orderBy(desc(campaigns.createdAt));
  const base = open.filter((c: any) => !mine.has(c.id));

  const pc = new Map<string, number>();
  const rc = new Map<string, number>();
  if (base.length) {
    const ids = base.map((c: any) => c.id);
    for (const r of await db
      .select({ cid: prompts.campaignId, c: count() })
      .from(prompts)
      .where(inArray(prompts.campaignId, ids))
      .groupBy(prompts.campaignId))
      pc.set((r as any).cid, Number((r as any).c));
    for (const r of await db
      .select({ cid: recordings.campaignId, c: count() })
      .from(recordings)
      .where(inArray(recordings.campaignId, ids))
      .groupBy(recordings.campaignId))
      rc.set((r as any).cid, Number((r as any).c));
  }
  const joinable = base.map((c: any) => ({
    ...c,
    _count: { prompts: pc.get(c.id) ?? 0, recordings: rc.get(c.id) ?? 0 },
  }));

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
