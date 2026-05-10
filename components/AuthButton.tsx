"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export function SignInButton({ className = "" }: { className?: string }) {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await signIn();
        } catch (e) {
          alert((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg shadow-soft transition hover:opacity-90 disabled:opacity-60 ${className}`}
    >
      <GoogleMark />
      {busy ? "Signing in…" : "Continue with Google"}
    </button>
  );
}

export function SignOutButton() {
  const { signOutNow } = useAuth();
  return (
    <button
      type="button"
      onClick={() => signOutNow()}
      className="rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
    >
      Sign out
    </button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden>
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.62z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A8.997 8.997 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.99-2.33z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A8.997 8.997 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
