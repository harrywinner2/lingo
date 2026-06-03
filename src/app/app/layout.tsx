import Link from "next/link";
import { Coins } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getBalance } from "@/lib/points";
import { Logo } from "@/components/logo";
import { SidebarNav, BottomNav } from "@/components/app-nav";
import { UserMenu } from "@/components/user-menu";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { formatPoints } from "@/lib/utils";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const balance = await getBalance(user.id);

  return (
    <div className="flex min-h-full flex-col">
      <ServiceWorkerRegister />
      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/app">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-bold">
              <Coins className="h-4 w-4 text-primary-600" />
              {formatPoints(balance)}
            </span>
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <div className="sticky top-20">
            <SidebarNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-24 md:pb-6">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
