import { and, eq, inArray } from "drizzle-orm";
import { getDb, campaigns, memberships } from "@/db";

export async function isMember(
  campaignId: string,
  userId: string,
  roles: string[],
) {
  if (!campaignId) return false;
  const db = await getDb();
  const c = await db
    .select({ ownerId: campaigns.ownerId })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);
  if (!c[0]) return false;
  if (c[0].ownerId === userId) return true;
  const m = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.campaignId, campaignId),
        eq(memberships.userId, userId),
        inArray(memberships.role, roles),
        inArray(memberships.status, ["active", "probation"]),
      ),
    )
    .limit(1);
  return m.length > 0;
}
