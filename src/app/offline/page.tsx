import { Logo } from "@/components/logo";

export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <h1 className="font-display text-2xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-muted">
        Recordings you make are saved on your device and will upload
        automatically once you&apos;re back online.
      </p>
    </div>
  );
}
