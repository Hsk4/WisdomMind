"use client";

import { usePublicPageRedirect } from "@/lib/guards";

/**
 * Keep authenticated visitors out of public entry pages. Sign-in loads the
 * profile and navigates to the API-provided role home, so this also handles
 * app relaunches with an existing local session.
 *
 * The rule itself lives in `lib/guards.tsx` (`usePublicPageRedirect`), next to
 * the panel guard it mirrors, so there is one place that decides where an
 * account goes.
 */
export function AuthRedirector() {
  usePublicPageRedirect();
  return null;
}
