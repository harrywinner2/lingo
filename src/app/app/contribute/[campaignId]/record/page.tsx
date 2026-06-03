import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { isMember } from "@/lib/membership";
import { RecordTask } from "@/components/record-task";

export default async function RecordPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const user = await requireUser();
  if (!(await isMember(campaignId, user.id, ["owner", "manager", "speaker"])))
    notFound();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link
        href={`/app/contribute/${campaignId}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <RecordTask campaignId={campaignId} />
    </div>
  );
}
