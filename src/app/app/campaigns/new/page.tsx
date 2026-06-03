"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createCampaign } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, Input, Label, Select, Textarea } from "@/components/ui/primitives";
import { TARGET_LANGUAGES, PIVOT_LANGUAGES } from "@/lib/languages";

export default function NewCampaignPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/app/campaigns"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Campaigns
      </Link>

      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          New campaign
        </h1>
        <p className="mt-1 text-muted">
          Define what you&apos;re collecting and how contributors are rewarded.
        </p>
      </div>

      <Card className="p-6">
        <form
          action={async (formData) => {
            setError(null);
            setSubmitting(true);
            try {
              await createCampaign({
                title: String(formData.get("title") || ""),
                description: String(formData.get("description") || ""),
                targetLang: String(formData.get("targetLang") || ""),
                pivotLang: String(formData.get("pivotLang") || "en"),
                budgetPoints: Number(formData.get("budgetPoints") || 0),
                rewardRecord: Number(formData.get("rewardRecord") || 0),
                rewardVerify: Number(formData.get("rewardVerify") || 0),
                minVerifications: Number(formData.get("minVerifications") || 3),
              });
            } catch (e) {
              // redirect() throws a control-flow signal we must rethrow
              if (e && typeof e === "object" && "digest" in e) throw e;
              setError(e instanceof Error ? e.message : "Something went wrong");
              setSubmitting(false);
            }
          }}
          className="space-y-5"
        >
          <div>
            <Label htmlFor="title">Campaign title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Everyday greetings in Bafia"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              placeholder="What kinds of phrases are you collecting, and why?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="targetLang">Target language</Label>
              <Select id="targetLang" name="targetLang" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {TARGET_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="pivotLang">Prompt language</Label>
              <Select id="pivotLang" name="pivotLang" defaultValue="en">
                {PIVOT_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-paper p-4">
            <p className="mb-3 text-sm font-semibold">Rewards & budget (points)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="budgetPoints">Total budget</Label>
                <Input
                  id="budgetPoints"
                  name="budgetPoints"
                  type="number"
                  min={0}
                  defaultValue={1000}
                />
              </div>
              <div>
                <Label htmlFor="minVerifications">Verifications per clip</Label>
                <Input
                  id="minVerifications"
                  name="minVerifications"
                  type="number"
                  min={1}
                  max={15}
                  defaultValue={3}
                />
              </div>
              <div>
                <Label htmlFor="rewardRecord">Per accepted recording</Label>
                <Input
                  id="rewardRecord"
                  name="rewardRecord"
                  type="number"
                  min={0}
                  defaultValue={15}
                />
              </div>
              <div>
                <Label htmlFor="rewardVerify">Per verification</Label>
                <Input
                  id="rewardVerify"
                  name="rewardVerify"
                  type="number"
                  min={0}
                  defaultValue={5}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            {submitting ? "Creating…" : "Create campaign"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
