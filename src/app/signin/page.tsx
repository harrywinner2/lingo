"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Label, Card } from "@/components/ui/primitives";

const devEnabled = process.env.NEXT_PUBLIC_AUTH_DEV_LOGIN !== "false";
const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";
const microsoftEnabled = process.env.NEXT_PUBLIC_MICROSOFT_ENABLED === "true";
const appleEnabled = process.env.NEXT_PUBLIC_APPLE_ENABLED === "true";
const oauthEnabled = googleEnabled || microsoftEnabled || appleEnabled;

const ERRORS: Record<string, string> = {
  OAuthSignin: "Couldn't start Google sign-in. Check the OAuth configuration.",
  OAuthCallback: "Google sign-in failed on callback. Check the redirect URI.",
  OAuthAccountNotLinked:
    "That email is already registered with a different sign-in method.",
  Configuration:
    "Sign-in isn't configured on the server. Set AUTH_SECRET and the Google keys.",
  AccessDenied: "Access was denied.",
  Default: "Something went wrong signing in. Please try again.",
};

export default function SignInPage() {
  const [email, setEmail] = useState("researcher@lingo.dev");
  const [loading, setLoading] = useState<string | null>(null);

  const search =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const callbackUrl = search.get("callbackUrl") || "/app";
  const errorCode = search.get("error");
  const errorMsg = errorCode ? ERRORS[errorCode] ?? ERRORS.Default : null;

  return (
    <div className="bg-grain flex min-h-full flex-col">
      <header className="px-5 py-4">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <Card className="w-full max-w-md p-8 shadow-lift animate-fade-up">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Welcome to Lingo
          </h1>
          <p className="mt-2 text-muted">
            Sign in to record, verify, or run a campaign.
          </p>

          {errorMsg && (
            <p className="mt-5 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {errorMsg}
            </p>
          )}

          <div className="mt-7 space-y-2.5">
            {googleEnabled && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                disabled={loading !== null}
                onClick={() => {
                  setLoading("google");
                  signIn("google", { callbackUrl });
                }}
              >
                <GoogleMark />
                {loading === "google" ? "Connecting…" : "Continue with Google"}
              </Button>
            )}

            {microsoftEnabled && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                disabled={loading !== null}
                onClick={() => {
                  setLoading("microsoft");
                  signIn("microsoft-entra-id", { callbackUrl });
                }}
              >
                <MicrosoftMark />
                {loading === "microsoft" ? "Connecting…" : "Continue with Microsoft"}
              </Button>
            )}

            {appleEnabled && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                disabled={loading !== null}
                onClick={() => {
                  setLoading("apple");
                  signIn("apple", { callbackUrl });
                }}
              >
                <AppleMark />
                {loading === "apple" ? "Connecting…" : "Continue with Apple"}
              </Button>
            )}
          </div>

          {devEnabled && (
            <>
              {oauthEnabled && (
                <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted">
                  <span className="h-px flex-1 bg-line" />
                  or dev login
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              <div className={oauthEnabled ? "" : "mt-6"} />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setLoading("dev");
                  signIn("dev", { email, callbackUrl });
                }}
              >
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
                <p className="mt-1.5 text-xs text-muted">
                  Use any email to test roles (e.g. speaker@lingo.dev,
                  verifier@lingo.dev).
                </p>
                <Button
                  type="submit"
                  size="lg"
                  className="mt-4 w-full"
                  disabled={loading !== null}
                >
                  {loading === "dev" ? "Signing in…" : "Continue"}
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs text-muted">
            By continuing you agree to contribute recordings for language
            preservation research.
          </p>
        </Card>
      </main>
    </div>
  );
}

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M16.37 12.78c.03 3.14 2.75 4.18 2.78 4.2-.02.07-.43 1.49-1.43 2.95-.86 1.27-1.76 2.53-3.18 2.56-1.39.03-1.84-.82-3.43-.82s-2.08.8-3.4.85c-1.36.05-2.4-1.37-3.27-2.63C2.27 17.3 1.05 12.6 2.86 9.42c.9-1.58 2.5-2.58 4.24-2.6 1.34-.03 2.6.9 3.43.9.82 0 2.36-1.11 3.97-.95.68.03 2.58.27 3.8 2.06-.1.06-2.27 1.33-2.93 3.95M13.8 4.6c.73-.88 1.22-2.1 1.08-3.32-1.05.04-2.32.7-3.07 1.58-.67.78-1.26 2.02-1.1 3.21 1.17.09 2.36-.6 3.09-1.47" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
