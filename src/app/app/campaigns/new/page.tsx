import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getAllLanguages } from "@/lib/languages-db";
import { NewCampaignForm } from "@/components/new-campaign-form";

export default async function NewCampaignPage() {
  await requireUser();
  const languages = await getAllLanguages();

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

      <NewCampaignForm languages={languages} />
    </div>
  );
}
