"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function UserMenu({ name, email }: { name?: string | null; email?: string | null }) {
  const [open, setOpen] = useState(false);
  const initial = (name || email || "?").charAt(0).toUpperCase();
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-paper"
        aria-label="Account menu"
      >
        {initial}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-line bg-card p-1.5 shadow-lift">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
