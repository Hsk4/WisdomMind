"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { takeSessionNotice } from "@/lib/session";

/**
 * Messages the app itself can hand the sign-in page.
 *
 * Two sources: `?reason=` in the URL (a link the app built), and the notice
 * the session left behind when it was cleared. The second is what makes "you
 * were signed out because this account was opened on another phone" possible —
 * a 401 cannot carry a query string, because the redirect happens after the
 * request.
 */
const REASONS: Record<string, string> = {
  session_expired: "Your session has expired. Please sign in again.",
  device_switched:
    "You were signed out because this account was opened on another phone.",
  password_changed:
    "Your password was changed, so this session ended. Sign in with the new password.",
  account_suspended:
    "This account is suspended. Contact the school office if you think that is a mistake.",
};

function Notice() {
  const params = useSearchParams();
  const reason = params.get("reason");
  /*
   * Read once, lazily, on the first client render: `localStorage` does not
   * exist during the static export's prerender, and the server snapshot is
   * `null`, so the notice appears after hydration without an effect that sets
   * state (which would render twice for nothing).
   */
  const [stored] = useState<string | null>(() => takeSessionNotice());

  const text =
    (reason && REASONS[reason]) || (stored && REASONS[stored]) || null;
  if (!text) return null;

  return (
    <p
      role="status"
      className="mb-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
    >
      {text}
    </p>
  );
}

export function SignInNotice() {
  // `useSearchParams` needs a Suspense boundary in a static export.
  return (
    <Suspense fallback={null}>
      <Notice />
    </Suspense>
  );
}
