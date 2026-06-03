import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import {
  getDb,
  users,
  accounts,
  sessions,
  verificationTokens,
  magicLinks,
  memberships,
} from "@/db";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Lazy (per-request) config so the D1 binding resolves inside the request scope
// on Cloudflare Workers.
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const db = await getDb();

  const providers: any[] = [];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (process.env.AUTH_DEV_LOGIN === "true") {
    providers.push(
      Credentials({
        id: "dev",
        name: "Dev login",
        credentials: { email: {}, name: {} },
        async authorize(creds) {
          const email = (creds?.email as string)?.trim().toLowerCase();
          if (!email) return null;
          const name =
            (creds?.name as string)?.trim() ||
            email.split("@")[0].replace(/[._-]+/g, " ");
          const found = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          let user = found[0];
          if (!user) {
            const inserted = await db
              .insert(users)
              .values({ email, name })
              .returning();
            user = inserted[0];
          }
          return { id: user.id, name: user.name, email: user.email, image: user.image };
        },
      }),
    );
  }

  // Magic-link sign-in for imported participants (reusable, campaign-scoped).
  providers.push(
    Credentials({
      id: "magic",
      name: "Magic link",
      credentials: { token: {} },
      async authorize(creds) {
        const token = (creds?.token as string)?.trim();
        if (!token) return null;
        const links = await db
          .select()
          .from(magicLinks)
          .where(eq(magicLinks.token, token))
          .limit(1);
        const link = links[0];
        if (!link) return null;
        if (link.expiresAt && link.expiresAt < new Date()) return null;

        let userId = link.userId;
        if (!userId) {
          let user = link.email
            ? (
                await db
                  .select()
                  .from(users)
                  .where(eq(users.email, link.email))
                  .limit(1)
              )[0]
            : undefined;
          if (!user) {
            user = (
              await db
                .insert(users)
                .values({
                  name: link.name ?? link.email ?? link.phone ?? "Participant",
                  email: link.email ?? null,
                })
                .returning()
            )[0];
          }
          userId = user.id;
          await db
            .update(magicLinks)
            .set({ userId })
            .where(eq(magicLinks.id, link.id));
        }

        // Ensure membership (active) in just that campaign.
        const existing = await db
          .select()
          .from(memberships)
          .where(
            and(
              eq(memberships.campaignId, link.campaignId),
              eq(memberships.userId, userId),
              eq(memberships.role, link.role),
            ),
          )
          .limit(1);
        if (existing[0]) {
          if (existing[0].status !== "active")
            await db
              .update(memberships)
              .set({ status: "active" })
              .where(eq(memberships.id, existing[0].id));
        } else {
          await db.insert(memberships).values({
            campaignId: link.campaignId,
            userId,
            role: link.role,
            status: "active",
          });
        }

        const u = (
          await db.select().from(users).where(eq(users.id, userId)).limit(1)
        )[0];
        return u ? { id: u.id, name: u.name, email: u.email, image: u.image } : null;
      },
    }),
  );

  return {
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    trustHost: true,
    session: { strategy: "jwt" },
    pages: { signIn: "/signin" },
    providers,
    callbacks: {
      async jwt({ token, user }: any) {
        if (user?.id) token.uid = user.id;
        if (!token.uid && token.email) {
          const u = (
            await db.select().from(users).where(eq(users.email, token.email)).limit(1)
          )[0];
          if (u) token.uid = u.id;
        }
        return token;
      },
      async session({ session, token }: any) {
        if (session.user && token.uid) session.user.id = token.uid as string;
        return session;
      },
    },
  };
});
