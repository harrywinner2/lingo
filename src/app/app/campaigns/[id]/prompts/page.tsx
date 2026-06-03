import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { CsvImporter } from "@/components/csv-importer";
import { QuickAddPrompt } from "@/components/quick-add-prompt";

export default async function PromptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const canManage =
    (await prisma.campaign.findFirst({
      where: { id, ownerId: user.id },
    })) !== null ||
    (await prisma.membership.findFirst({
      where: { campaignId: id, userId: user.id, role: { in: ["owner", "manager"] } },
    })) !== null;
  if (!canManage) notFound();

  const prompts = await prisma.prompt.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { recordings: true } } },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <Link
        href={`/app/campaigns/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Campaign
      </Link>

      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Prompts
        </h1>
        <p className="mt-1 text-muted">
          Phrases speakers will record. Import a batch or add one at a time.
        </p>
      </div>

      <CsvImporter campaignId={id} />
      <QuickAddPrompt campaignId={id} />

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          {prompts.length} prompt{prompts.length === 1 ? "" : "s"}
        </h2>
        {prompts.length === 0 ? (
          <Card className="p-8 text-center text-muted">
            No prompts yet — import a CSV above to get started.
          </Card>
        ) : (
          <div className="space-y-2">
            {prompts.map((p) => {
              const done = p._count.recordings >= p.targetN;
              return (
                <Card
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.pivotText}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {p.domain ? `${p.domain} · ` : ""}
                      {p._count.recordings}/{p.targetN} recordings
                    </p>
                  </div>
                  <Badge tone={done ? "success" : "neutral"}>
                    {done ? "complete" : "collecting"}
                  </Badge>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
