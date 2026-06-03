"use client";

import { useState } from "react";
import { Gift, Plus, Coins } from "lucide-react";
import { createReward, setRewardActive } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, Input, Label, Textarea, Badge } from "@/components/ui/primitives";
import { formatPoints } from "@/lib/utils";

type Reward = {
  id: string;
  title: string;
  description: string | null;
  costPoints: number;
  active: boolean;
  redemptions: number;
};

export function RewardManager({
  campaignId,
  rewards,
}: {
  campaignId: string;
  rewards: Reward[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold">Add a reward</h3>
        </div>
        <form
          action={async (fd) => {
            setError(null);
            setBusy(true);
            try {
              await createReward(campaignId, {
                title: String(fd.get("title") || ""),
                description: String(fd.get("description") || ""),
                costPoints: Number(fd.get("costPoints") || 0),
              });
              (document.getElementById("reward-form") as HTMLFormElement)?.reset();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not add reward");
            } finally {
              setBusy(false);
            }
          }}
          id="reward-form"
          className="grid gap-4 sm:grid-cols-[1fr_160px]"
        >
          <div className="sm:col-span-2 sm:grid sm:grid-cols-[1fr_160px] sm:gap-4">
            <div>
              <Label htmlFor="title">Reward</Label>
              <Input
                id="title"
                name="title"
                placeholder="5,000 XAF mobile money"
                required
              />
            </div>
            <div>
              <Label htmlFor="costPoints">Cost (points)</Label>
              <Input
                id="costPoints"
                name="costPoints"
                type="number"
                min={1}
                placeholder="500"
                required
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Details (optional)</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="How it's paid out, conditions, etc."
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add reward"}
            </Button>
            {error && (
              <span className="ml-3 text-sm font-medium text-danger">{error}</span>
            )}
          </div>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          {rewards.length} reward{rewards.length === 1 ? "" : "s"}
        </h2>
        {rewards.length === 0 ? (
          <Card className="p-8 text-center text-muted">
            No rewards yet — add one above so contributors have something to
            redeem.
          </Card>
        ) : (
          <div className="space-y-2">
            {rewards.map((r) => (
              <Card key={r.id} className="flex items-center gap-3 p-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-600">
                  <Coins className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-muted">
                    {formatPoints(r.costPoints)} pts · {r.redemptions} redeemed
                    {r.description ? ` · ${r.description}` : ""}
                  </p>
                </div>
                {!r.active && <Badge tone="neutral">hidden</Badge>}
                <ToggleButton id={r.id} active={r.active} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleButton({ id, active }: { id: string; active: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await setRewardActive(id, !active);
        } finally {
          setBusy(false);
        }
      }}
    >
      {active ? "Hide" : "Show"}
    </Button>
  );
}
