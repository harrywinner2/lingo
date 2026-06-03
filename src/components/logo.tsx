import { cn } from "@/lib/utils";

export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect width="32" height="32" rx="9" fill="#1c1a17" />
        {/* sound wave bars */}
        <rect x="8" y="13" width="2.6" height="6" rx="1.3" fill="#de9b10" />
        <rect x="12.4" y="9" width="2.6" height="14" rx="1.3" fill="#de9b10" />
        <rect x="16.8" y="6.5" width="2.6" height="19" rx="1.3" fill="#0e7c66" />
        <rect x="21.2" y="11" width="2.6" height="10" rx="1.3" fill="#de9b10" />
      </svg>
      {withWordmark && (
        <span className="font-display text-xl font-semibold tracking-tight text-ink">
          Lingo
        </span>
      )}
    </span>
  );
}
