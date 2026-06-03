import { NextResponse } from "next/server";
import { and, eq, inArray, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, redemptions, users } from "@/db";
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
  const db = await getDb();
  const statusFilter =
    status === "open"
      ? eq(redemptions.status, "open")
      : status === "history"
        ? inArray(redemptions.status, ["redeemed", "rejected"])
        : undefined;

  const rows = await db
    .select({
      id: redemptions.id,
      contributor: users.name,
      email: users.email,
      reward: redemptions.rewardTitle,
      points: redemptions.points,
      status: redemptions.status,
      requestedAt: redemptions.createdAt,
      handledAt: redemptions.handledAt,
    })
    .from(redemptions)
    .innerJoin(users, eq(redemptions.userId, users.id))
    .where(
      statusFilter
        ? and(eq(redemptions.campaignId, id), statusFilter)
        : eq(redemptions.campaignId, id),
    )
    .orderBy(desc(redemptions.createdAt));

  const csv = toCsv(
    rows.map((r: any) => ({ ...r, contributor: r.contributor ?? "", email: r.email ?? "", reward: r.reward ?? "", handledAt: r.handledAt ?? "" })),
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
