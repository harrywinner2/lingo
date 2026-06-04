"use client";

import { useState } from "react";
import { Cloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Posts the campaign's dataset export to the researcher's OneDrive via Microsoft
// Graph. The endpoint self-gates (503) until Microsoft creds + a linked account
// exist, so this is safe to always render.
export function ExportOneDriveButton({ campaignId }: { campaignId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-end">
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          try {
            const r = await fetch("/api/export/onedrive", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campaignId }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.status === 503) {
              setMsg(d.error || "OneDrive export not available — sign in with Microsoft");
            } else if (!r.ok) {
              setMsg(d.error || "OneDrive export failed");
            } else {
              if (d.webUrl) window.open(d.webUrl, "_blank");
              setMsg("Exported to OneDrive");
            }
          } catch {
            setMsg("OneDrive export failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
        {busy ? "Exporting…" : "Export to OneDrive"}
      </Button>
      {msg && <span className="mt-1 max-w-[16rem] text-right text-xs text-muted">{msg}</span>}
    </div>
  );
}
