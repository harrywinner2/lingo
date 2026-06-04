"use client";

import { AiPromptGenerator } from "@/components/ai-prompt-generator";
import { importPrompts } from "@/lib/actions";

// Client bridge: the prompts page is a Server Component and can't pass a function
// prop, so this wraps AiPromptGenerator and routes selected prompts through the
// existing importPrompts server action (role-checked + revalidates the page).
export function AiPromptGeneratorBlock({
  campaignId,
  locale,
}: {
  campaignId: string;
  locale?: string;
}) {
  return (
    <AiPromptGenerator
      campaignId={campaignId}
      locale={locale}
      onAdd={async (prompts) => {
        await importPrompts(
          campaignId,
          prompts.map((t) => ({ pivotText: t })),
        );
      }}
    />
  );
}
