"use client";

import { useState } from "react";
import { Mic, CheckCircle2 } from "lucide-react";
import { requestToJoin } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function JoinOpenCampaign({ campaignId }: { campaignId: string }) {
  const [roles, setRoles] = useState<string[]>(["contributor"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(r: string) {
    setRoles((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));
  }

  const opts = [
    { key: "contributor", label: "Contribute", icon: Mic },
    { key: "validator", label: "Validate", icon: CheckCircle2 },
  ];

  return (
    <div>
      <div className="flex gap-2">
        {opts.map((o) => {
          const on = roles.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => toggle(o.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                on
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-card text-muted hover:border-accent/50",
              )}
            >
              <o.icon className="h-4 w-4" /> {o.label}
            </button>
          );
        })}
      </div>
      <Button
        size="sm"
        className="mt-3"
        disabled={busy || roles.length === 0}
        onClick={async () => {
          setError(null);
          setBusy(true);
          try {
            await requestToJoin(campaignId, roles);
          } catch (e) {
            if (e && typeof e === "object" && "digest" in e) throw e;
            setError(e instanceof Error ? e.message : "Could not join");
            setBusy(false);
          }
        }}
      >
        {busy ? "Joining…" : "Request to join"}
      </Button>
      {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
