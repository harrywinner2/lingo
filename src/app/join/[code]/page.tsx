import { redirect } from "next/navigation";
import { Mic } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { joinByCode } from "@/lib/actions";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/primitives";
import { langName } from "@/lib/languages";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?callbackUrl=/join/${code}`);

  const invite = await prisma.invite.findUnique({
    where: { code },
    include: { campaign: true },
  });

  if (!invite) {
    return (
      <Centered>
        <p className="font-semibold">This invite link is invalid.</p>
        <p className="text-sm text-muted">Ask the researcher for a new one.</p>
      </Centered>
    );
  }

  return (
    <Centered>
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary-600">
        <Mic className="h-7 w-7" />
      </span>
      <h1 className="font-display text-2xl font-semibold">
        Join “{invite.campaign.title}”
      </h1>
      <p className="text-muted">
        {langName(invite.campaign.targetLang)} · you&apos;ve been invited as a{" "}
        <Badge tone="primary">{invite.role}</Badge>
      </p>
      <form
        action={async () => {
          "use server";
          await joinByCode(code);
        }}
        className="w-full"
      >
        <Button size="lg" type="submit" className="mt-2 w-full">
          Join campaign
        </Button>
      </form>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-grain flex min-h-full flex-col">
      <header className="px-5 py-4">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <Card className="flex w-full max-w-md flex-col items-center gap-3 p-8 text-center shadow-lift">
          {children}
        </Card>
      </main>
    </div>
  );
}
