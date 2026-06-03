import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mic, CheckCircle2, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/primitives";
import { langName } from "@/lib/languages";

export default async function ContributeHub({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const user = await requireUser();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) notFound();

  const roles = (
    await prisma.membership.findMany({
      where: { campaignId, userId: user.id, status: "active" },
      select: { role: true },
    })
  ).map((r) => r.role);
  const isOwner = campaign.ownerId === user.id;
  if (roles.length === 0 && !isOwner) notFound();

  const canRecord =
    isOwner || roles.some((r) => ["speaker", "manager"].includes(r));
  const canVerify =
    isOwner || roles.some((r) => ["verifier", "reviewer", "manager"].includes(r));

  return (
    <div className="space-y-6">
      <Link
        href="/app/contribute"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Contribute
      </Link>

      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {campaign.title}
        </h1>
        <p className="mt-1 text-muted">
          {langName(campaign.targetLang)} · prompts in{" "}
          {langName(campaign.pivotLang)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {canRecord && (
          <TaskCard
            href={`/app/contribute/${campaignId}/record`}
            icon={Mic}
            tone="text-primary-600 bg-primary/15"
            title="Record phrases"
            desc="Speak prompts in the target language"
          />
        )}
        {canVerify && (
          <TaskCard
            href={`/app/contribute/${campaignId}/verify`}
            icon={CheckCircle2}
            tone="text-accent-600 bg-accent/12"
            title="Verify recordings"
            desc="Rate whether clips match their prompt"
          />
        )}
      </div>
    </div>
  );
}

function TaskCard({
  href,
  icon: Icon,
  tone,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="flex items-center gap-4 p-6 transition group-hover:shadow-lift">
        <span
          className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}
        >
          <Icon className="h-7 w-7" />
        </span>
        <div className="flex-1">
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-sm text-muted">{desc}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted transition group-hover:translate-x-0.5" />
      </Card>
    </Link>
  );
}
