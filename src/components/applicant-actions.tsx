"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { decideApplicant } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function ApplicantActions({ membershipId }: { membershipId: string }) {
  const [busy, setBusy] = useState(false);
  async function run(decision: "approve" | "reject") {
    setBusy(true);
    try {
      await decideApplicant(membershipId, decision);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => run("reject")}>
        <X className="h-4 w-4" /> Reject
      </Button>
      <Button size="sm" variant="success" disabled={busy} onClick={() => run("approve")}>
        <Check className="h-4 w-4" /> Approve
      </Button>
    </div>
  );
}
