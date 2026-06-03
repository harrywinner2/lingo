import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMember } from "@/lib/membership";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMember(id, session.user.id, ["owner", "manager"])))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = new URL(req.url).searchParams.get("status") || "all";
  const where =
    status === "open"
      ? { campaignId: id, status: "open" }
      : status === "history"
        ? { campaignId: id, status: { in: ["redeemed", "rejected"] } }
        : { campaignId: id };

  const rows = await prisma.redemption.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    rows.map((r) => ({
      id: r.id,
      contributor: r.user.name ?? "",
      email: r.user.email ?? "",
      reward: r.rewardTitle ?? "",
      points: r.points,
      status: r.status,
      requestedAt: r.createdAt,
      handledAt: r.handledAt ?? "",
    })),
    [
      { key: "id", header: "Redemption ID" },
      { key: "contributor", header: "Contributor" },
      { key: "email", header: "Email" },
      { key: "reward", header: "Reward" },
      { key: "points", header: "Points" },
      { key: "status", header: "Status" },
      { key: "requestedAt", header: "Requested at" },
      { key: "handledAt", header: "Handled at" },
    ],
  );

  return csvResponse(csv, `redemptions-${status}-${id}.csv`);
}
