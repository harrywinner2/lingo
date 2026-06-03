"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { redeemReward } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function RedeemButton({
  rewardId,
  disabled,
}: {
  rewardId: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={busy || disabled}
        onClick={async () => {
          setErr(null);
          setBusy(true);
          try {
            await redeemReward(rewardId);
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Could not redeem");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Gift className="h-4 w-4" /> {busy ? "…" : "Redeem"}
      </Button>
      {err && <span className="text-xs font-medium text-danger">{err}</span>}
    </div>
  );
}
