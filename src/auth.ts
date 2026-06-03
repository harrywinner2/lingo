import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// Dev-only login: sign in as any email so you can test every role solo.
if (process.env.AUTH_DEV_LOGIN === "true") {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(creds) {
        const email = (creds?.email as string)?.trim().toLowerCase();
        if (!email) return null;
        const name =
          (creds?.name as string)?.trim() ||
          email.split("@")[0].replace(/[._-]+/g, " ");
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name },
        });
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
    credentials: { token: { label: "Token", type: "text" } },
    async authorize(creds) {
      const token = (creds?.token as string)?.trim();
      if (!token) return null;
      const link = await prisma.magicLink.findUnique({ where: { token } });
      if (!link) return null;
      if (link.expiresAt && link.expiresAt < new Date()) return null;

      let userId = link.userId;
      if (!userId) {
        let user = link.email
          ? await prisma.user.findUnique({ where: { email: link.email } })
          : null;
        if (!user) {
          user = await prisma.user.create({
            data: {
              name: link.name ?? link.email ?? link.phone ?? "Participant",
              email: link.email ?? undefined,
            },
          });
        }
        userId = user.id;
        await prisma.magicLink.update({
          where: { id: link.id },
          data: { userId },
        });
      }

      // Ensure the participant is a member of (only) that campaign.
      await prisma.membership.upsert({
        where: {
          campaignId_userId_role: {
            campaignId: link.campaignId,
            userId,
            role: link.role,
          },
        },
        update: { status: "active" },
        create: {
          campaignId: link.campaignId,
          userId,
          role: link.role,
          status: "active",
        },
      });

      const u = await prisma.user.findUnique({ where: { id: userId } });
      return u ? { id: u.id, name: u.name, email: u.email, image: u.image } : null;
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      // For credentials sign-in the user id is already on `user`.
      if (!token.uid && token.email) {
        const u = await prisma.user.findUnique({ where: { email: token.email } });
        if (u) token.uid = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
});
