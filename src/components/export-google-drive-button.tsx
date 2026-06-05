"use client";

import { useState } from "react";
import { HardDrive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Exports the campaign dataset to the researcher's Google Drive. If Drive isn't
// connected yet (503 {connect:true}), it sends them through the one-time consent
// flow and returns here; they click again to export.
export function ExportGoogleDriveButton({ campaignId }: { campaignId: string }) {
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
            const r = await fetch("/api/export/google-drive", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campaignId }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.status === 503 && d.connect) {
              const ret = typeof window !== "undefined" ? window.location.pathname : "/app";
              window.location.href = `/api/connect/google-drive?return=${encodeURIComponent(ret)}`;
              return;
            }
            if (!r.ok) {
              setMsg(d.error || "Google Drive export failed");
            } else {
              if (d.webUrl) window.open(d.webUrl, "_blank");
              setMsg("Exported to Google Drive");
            }
          } catch {
            setMsg("Google Drive export failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
        {busy ? "Exporting…" : "Export to Google Drive"}
      </Button>
      {msg && <span className="mt-1 max-w-[16rem] text-right text-xs text-muted">{msg}</span>}
    </div>
  );
}
