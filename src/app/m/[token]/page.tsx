import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/primitives";
import { MagicSignIn } from "@/components/magic-signin";

export default async function MagicLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await prisma.magicLink.findUnique({
    where: { token },
    include: { campaign: true },
  });

  const valid = link && (!link.expiresAt || link.expiresAt > new Date());

  return (
    <div className="bg-grain flex min-h-full flex-col">
      <header className="px-5 py-4">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <Card className="flex w-full max-w-md flex-col items-center gap-3 p-8 text-center shadow-lift">
          {valid ? (
            <MagicSignIn
              token={token}
              campaignId={link.campaignId}
              campaignTitle={link.campaign.title}
              name={link.name}
            />
          ) : (
            <>
              <p className="font-semibold">This link is no longer valid.</p>
              <p className="text-sm text-muted">
                Ask the organizer for a fresh invitation link.
              </p>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
