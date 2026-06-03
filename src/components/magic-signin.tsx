"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, Mic } from "lucide-react";

export function MagicSignIn({
  token,
  campaignId,
  campaignTitle,
  name,
}: {
  token: string;
  campaignId: string;
  campaignTitle: string;
  name?: string | null;
}) {
  const [error, setError] = useState(false);

  useEffect(() => {
    signIn("magic", {
      token,
      callbackUrl: `/app/contribute/${campaignId}`,
      redirect: true,
    }).catch(() => setError(true));
  }, [token, campaignId]);

  return (
    <>
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary-600">
        <Mic className="h-7 w-7" />
      </span>
      <h1 className="font-display text-2xl font-semibold">
        {name ? `Welcome, ${name.split(" ")[0]}!` : "Welcome!"}
      </h1>
      <p className="text-muted">
        Signing you in to <strong>{campaignTitle}</strong>…
      </p>
      {!error ? (
        <Loader2 className="mt-2 h-6 w-6 animate-spin text-muted" />
      ) : (
        <p className="text-sm font-medium text-danger">
          Something went wrong — please reopen your link.
        </p>
      )}
    </>
  );
}
