import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { InviteManager } from "@/components/invite-manager";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const canManage =
    (await prisma.campaign.findFirst({ where: { id, ownerId: user.id } })) !==
      null ||
    (await prisma.membership.findFirst({
      where: { campaignId: id, userId: user.id, role: { in: ["owner", "manager"] } },
    })) !== null;
  if (!canManage) notFound();

  const [members, invites] = await Promise.all([
    prisma.membership.findMany({
      where: { campaignId: id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invite.findMany({
      where: { campaignId: id, usedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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
          People
        </h1>
        <p className="mt-1 text-muted">
          Invite contributors with a role. Share the link — they sign in and
          join instantly.
        </p>
      </div>

      <InviteManager campaignId={id} openInvites={invites} />

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
                <p className="truncate font-medium">
                  {m.user.name || m.user.email}
                </p>
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
