"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Megaphone, Mic, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/app/contribute", label: "Contribute", icon: Mic },
  { href: "/app/wallet", label: "Wallet", icon: Wallet },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex md:flex-col md:gap-1">
      {links.map((l) => {
        const active = isActive(pathname, l.href, l.exact);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-ink text-paper"
                : "text-muted hover:bg-black/5 hover:text-ink",
            )}
          >
            <l.icon className="h-[18px] w-[18px]" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {links.map((l) => {
          const active = isActive(pathname, l.href, l.exact);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition",
                active ? "text-primary-600" : "text-muted",
              )}
            >
              <l.icon className="h-5 w-5" />
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
