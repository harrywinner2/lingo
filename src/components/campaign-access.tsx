"use client";

import { useState } from "react";
import { Globe, Lock, Sparkles } from "lucide-react";
import { setCampaignVisibility, setAutoQualify } from "@/lib/actions";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition",
        on ? "bg-accent" : "bg-line",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

export function CampaignAccess({
  campaignId,
  visibility,
  autoQualify,
}: {
  campaignId: string;
  visibility: string;
  autoQualify: boolean;
}) {
  const [open, setOpen] = useState(visibility === "open");
  const [auto, setAuto] = useState(autoQualify);
  const [busy, setBusy] = useState(false);

  return (
    <Card className="divide-y divide-line p-0">
      <div className="flex items-center gap-3 p-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/5">
          {open ? <Globe className="h-5 w-5 text-accent-600" /> : <Lock className="h-5 w-5 text-muted" />}
        </span>
        <div className="flex-1">
          <p className="font-semibold">Open campaign</p>
          <p className="text-sm text-muted">
            {open
              ? "Listed in Discover — anyone can ask to join."
              : "Private — people join only by invite or link."}
          </p>
        </div>
        <Toggle
          on={open}
          disabled={busy}
          onChange={async () => {
            const next = !open;
            setOpen(next);
            setBusy(true);
            try {
              await setCampaignVisibility(campaignId, next ? "open" : "private");
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
      <div className="flex items-center gap-3 p-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/5">
          <Sparkles className="h-5 w-5 text-primary-600" />
        </span>
        <div className="flex-1">
          <p className="font-semibold">Auto-qualify applicants</p>
          <p className="text-sm text-muted">
            Promote probation members automatically once their work proves out.
          </p>
        </div>
        <Toggle
          on={auto}
          disabled={busy}
          onChange={async () => {
            const next = !auto;
            setAuto(next);
            setBusy(true);
            try {
              await setAutoQualify(campaignId, next);
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </Card>
  );
}
