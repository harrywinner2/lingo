"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { markRedeemed, rejectRedemption } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function RedemptionActions({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => run(() => rejectRedemption(id))}
      >
        <X className="h-4 w-4" /> Reject
      </Button>
      <Button
        size="sm"
        variant="success"
        disabled={busy}
        onClick={() => run(() => markRedeemed(id))}
      >
        <Check className="h-4 w-4" /> Redeemed
      </Button>
    </div>
  );
}
