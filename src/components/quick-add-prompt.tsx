"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { addPrompt } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";

export function QuickAddPrompt({ campaignId }: { campaignId: string }) {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form
      className="flex gap-2"
      action={async (fd) => {
        const text = String(fd.get("pivotText") || "").trim();
        if (!text) return;
        setBusy(true);
        try {
          await addPrompt(campaignId, text);
          if (ref.current) ref.current.value = "";
        } finally {
          setBusy(false);
        }
      }}
    >
      <Input
        ref={ref}
        name="pivotText"
        placeholder="Add a single prompt…"
        required
      />
      <Button type="submit" variant="outline" disabled={busy}>
        <Plus className="h-4 w-4" /> Add
      </Button>
    </form>
  );
}
