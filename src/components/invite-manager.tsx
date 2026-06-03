"use client";

import { useState } from "react";
import { Link2, Copy, Check } from "lucide-react";
import { createInvite } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, Select, Badge } from "@/components/ui/primitives";

const ROLES = ["speaker", "verifier", "reviewer", "manager"];

type Invite = { id: string; code: string; role: string };

export function InviteManager({
  campaignId,
  openInvites,
}: {
  campaignId: string;
  openInvites: Invite[];
}) {
  const [role, setRole] = useState("speaker");
  const [busy, setBusy] = useState(false);
  const [invites, setInvites] = useState<Invite[]>(openInvites);
  const [copied, setCopied] = useState<string | null>(null);

  const linkFor = (code: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/app/join/${code}`
      : `/app/join/${code}`;

  async function generate() {
    setBusy(true);
    try {
      const code = await createInvite(campaignId, role);
      setInvites((prev) => [{ id: code, code, role }, ...prev]);
    } finally {
      setBusy(false);
    }
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(linkFor(code));
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-accent-600" />
        <h3 className="font-semibold">Invite people</h3>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label className="mb-1 block text-xs font-semibold text-muted">
            Role
          </label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={generate} disabled={busy}>
          {busy ? "Creating…" : "Create invite link"}
        </Button>
      </div>

      {invites.length > 0 && (
        <div className="mt-5 space-y-2">
          {invites.map((inv) => (
            <div
              key={inv.code}
              className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2"
            >
              <Badge tone="primary">{inv.role}</Badge>
              <code className="min-w-0 flex-1 truncate text-sm text-muted">
                {linkFor(inv.code)}
              </code>
              <Button size="sm" variant="ghost" onClick={() => copy(inv.code)}>
                {copied === inv.code ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
