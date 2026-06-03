import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserCheck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { InviteManager } from "@/components/invite-manager";
import { ParticipantImport } from "@/components/participant-import";
import { CampaignAccess } from "@/components/campaign-access";
import { ApplicantActions } from "@/components/applicant-actions";

async function applicantStats(campaignId: string, userId: string, role: string) {
  if (role === "speaker") {
    const [accepted, total] = await Promise.all([
      prisma.recording.count({ where: { campaignId, speakerId: userId, status: "accepted" } }),
      prisma.recording.count({ where: { campaignId, speakerId: userId } }),
    ]);
    return `${accepted} accepted · ${total} recorded`;
  }
  const vs = await prisma.verification.findMany({
    where: {
      verifierId: userId,
      recording: { campaignId, status: { in: ["accepted", "rejected"] } },
    },
    include: { recording: { select: { status: true } } },
  });
  if (vs.length === 0) return "no verifications yet";
  const agree = vs.filter(
    (v) => (v.verdict !== "incorrect") === (v.recording.status === "accepted"),
  ).length;
  return `${vs.length} verified · ${Math.round((agree / vs.length) * 100)}% agreement`;
}

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();
  const canManage =
    campaign.ownerId === user.id ||
    (await prisma.membership.findFirst({
      where: { campaignId: id, userId: user.id, role: { in: ["owner", "manager"] } },
    })) !== null;
  if (!canManage) notFound();

  const [members, applicants, invites] = await Promise.all([
    prisma.membership.findMany({
      where: { campaignId: id, status: "active" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.membership.findMany({
      where: { campaignId: id, status: "probation" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invite.findMany({
      where: { campaignId: id, usedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const applicantsWithStats = await Promise.all(
    applicants.map(async (a) => ({
      ...a,
      stats: await applicantStats(id, a.userId, a.role),
    })),
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/app/campaigns/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Campaign
      </Link>

      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">People</h1>
        <p className="mt-1 text-muted">
          Import participants, share invite links, or open the campaign for anyone
          to join.
        </p>
      </div>

      <CampaignAccess
        campaignId={id}
        visibility={campaign.visibility}
        autoQualify={campaign.autoQualify}
      />

      <ParticipantImport campaignId={id} />

      <InviteManager campaignId={id} openInvites={invites} />

      {/* Applicants awaiting qualification */}
      {applicantsWithStats.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <UserCheck className="h-5 w-5 text-primary-600" />
            Applicants ({applicantsWithStats.length})
          </h2>
          <div className="space-y-2">
            {applicantsWithStats.map((a) => (
              <Card key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-paper">
                  {(a.user.name || a.user.email || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {a.user.name || a.user.email}
                  </p>
                  <p className="truncate text-xs text-muted">
                    wants {a.role === "speaker" ? "to contribute" : "to validate"} ·{" "}
                    {a.stats}
                  </p>
                </div>
                <Badge tone="warning">probation</Badge>
                <ApplicantActions membershipId={a.id} />
              </Card>
            ))}
          </div>
        </section>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          {members.length} member{members.length === 1 ? "" : "s"}
        </h2>
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id} className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-paper">
                {(m.user.name || m.user.email || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.user.name || m.user.email}</p>
                <p className="truncate text-xs text-muted">{m.user.email}</p>
              </div>
              <Badge
                tone={
                  m.role === "owner"
                    ? "primary"
                    : m.role === "verifier"
                      ? "accent"
                      : "neutral"
                }
              >
                {m.role}
              </Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
