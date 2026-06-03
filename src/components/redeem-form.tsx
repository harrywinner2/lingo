"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { requestRedemption } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, Input, Label, Select } from "@/components/ui/primitives";

const METHODS = [
  { value: "mobile_money", label: "Mobile money" },
  { value: "cash", label: "Cash" },
  { value: "food", label: "Food / goods" },
  { value: "other", label: "Other" },
];

export function RedeemForm({ balance }: { balance: number }) {
  const [points, setPoints] = useState(Math.min(100, balance));
  const [method, setMethod] = useState("mobile_money");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canRedeem = balance > 0 && points > 0 && points <= balance;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary-600" />
        <h3 className="font-semibold">Redeem points</h3>
      </div>
      <p className="mt-1 text-sm text-muted">
        Send a request to the researcher. They&apos;ll arrange payout the way you
        agreed.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="points">Points</Label>
          <Input
            id="points"
            type="number"
            min={1}
            max={balance}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="method">Method</Label>
          <Select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
        <Button
          disabled={!canRedeem || busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              await requestRedemption(points, method);
              setMsg("Request sent ✓");
            } catch {
              setMsg("Could not send request");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Sending…" : "Request"}
        </Button>
      </div>
      {msg && <p className="mt-3 text-sm font-semibold text-accent-600">{msg}</p>}
    </Card>
  );
}
