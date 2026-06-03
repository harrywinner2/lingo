import Link from "next/link";
import { Plus, Mic, CheckCircle2, ArrowRight, Megaphone } from "lucide-react";
import { and, eq, inArray, desc, count } from "drizzle-orm";
import { requireUser } from "@/lib/session";
import {
  getDb,
  campaigns as campaignsTable,
  memberships as membershipsTable,
  prompts,
  recordings,
  verifications,
} from "@/db";
import { getBalance } from "@/lib/points";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/primitives";
import { langName } from "@/lib/languages";
import { formatPoints } from "@/lib/utils";

export default async function Dashboard() {
  const user = await requireUser();
  const db = await getDb();

  const ownedBase = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.ownerId, user.id))
    .orderBy(desc(campaignsTable.createdAt));
  const ownedIds = ownedBase.map((c: any) => c.id);
  const pc = new Map<string, number>();
  const rc = new Map<string, number>();
  if (ownedIds.length) {
    for (const r of await db
      .select({ cid: prompts.campaignId, c: count() })
      .from(prompts)
      .where(inArray(prompts.campaignId, ownedIds))
      .groupBy(prompts.campaignId))
      pc.set((r as any).cid, Number((r as any).c));
    for (const r of await db
      .select({ cid: recordings.campaignId, c: count() })
      .from(recordings)
      .where(inArray(recordings.campaignId, ownedIds))
      .groupBy(recordings.campaignId))
      rc.set((r as any).cid, Number((r as any).c));
  }
  const owned = ownedBase.map((c: any) => ({
    ...c,
    _count: { prompts: pc.get(c.id) ?? 0, recordings: rc.get(c.id) ?? 0 },
  }));

  const [memberships, recCountRows, verCountRows, balance] = await Promise.all([
    db.query.memberships.findMany({
      where: and(
        eq(membershipsTable.userId, user.id),
        inArray(membershipsTable.role, ["speaker", "verifier", "reviewer"]),
      ),
      with: { campaign: true },
    }),
    db.select({ c: count() }).from(recordings).where(eq(recordings.speakerId, user.id)),
    db.select({ c: count() }).from(verifications).where(eq(verifications.verifierId, user.id)),
    getBalance(user.id),
  ]);
  const recordingCount = Number(recCountRows[0].c);
  const verificationCount = Number(verCountRows[0].c);

  const firstName = (user.name || "there").split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Hello, {firstName}
        </h1>
        <p className="mt-1 text-muted">
          Record, verify, or run a campaign — every contribution counts.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Points" value={formatPoints(balance)} tone="primary" />
        <Stat label="Recordings" value={recordingCount} tone="accent" />
        <Stat label="Verifications" value={verificationCount} tone="success" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/app/contribute" className="group">
          <Card className="flex items-center gap-4 p-5 transition group-hover:shadow-lift">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary-600">
              <Mic className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">Contribute</p>
              <p className="text-sm text-muted">Record & verify phrases</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted transition group-hover:translate-x-0.5" />
          </Card>
        </Link>
        <Link href="/app/campaigns/new" className="group">
          <Card className="flex items-center gap-4 p-5 transition group-hover:shadow-lift">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/12 text-accent-600">
              <Plus className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">New campaign</p>
              <p className="text-sm text-muted">Collect a new dataset</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted transition group-hover:translate-x-0.5" />
          </Card>
        </Link>
      </div>

      {/* Owned campaigns */}
      {owned.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your campaigns</h2>
            <Link href="/app/campaigns" className="text-sm font-semibold text-accent-600">
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {owned.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/app/campaigns/${c.id}`}>
                <Card className="p-4 transition hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.title}</span>
                    <Badge tone={c.status === "active" ? "success" : "neutral"}>
                      {c.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {c.targetLangName ?? langName(c.targetLang)} · {c._count.prompts} prompts ·{" "}
                    {c._count.recordings} recordings
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Member campaigns */}
      {memberships.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">You&apos;re contributing to</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {memberships.map((m) => (
              <Link key={m.id} href={`/app/contribute/${m.campaignId}`}>
                <Card className="flex items-center justify-between p-4 transition hover:shadow-lift">
                  <div>
                    <span className="font-semibold">{m.campaign.title}</span>
                    <p className="mt-0.5 text-sm text-muted">
                      {m.campaign.targetLangName ?? langName(m.campaign.targetLang)}
                    </p>
                  </div>
                  <Badge tone="primary">{m.role}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {owned.length === 0 && memberships.length === 0 && (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Megaphone className="h-9 w-9 text-muted" />
          <p className="font-semibold">No campaigns yet</p>
          <p className="max-w-sm text-sm text-muted">
            Create your first campaign to collect recordings, or join one with an
            invite link from a researcher.
          </p>
          <Link href="/app/campaigns/new">
            <Button>
              <Plus className="h-4 w-4" /> Create a campaign
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "primary" | "accent" | "success";
}) {
  const tones = {
    primary: "text-primary-600",
    accent: "text-accent-600",
    success: "text-success",
  };
  return (
    <Card className="p-4">
      <p className={`font-display text-2xl font-semibold ${tones[tone]}`}>
        {value}
      </p>
      <p className="text-xs font-medium text-muted">{label}</p>
    </Card>
  );
}
