"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UserRole } from "@lms/shared";
import { useAuth } from "./auth-context";
import { webHomeFor } from "./role-home";
import { PanelSkeleton } from "@/components/shared/skeleton";

/**
 * Client panel guard. UX only: it mirrors the API's rules so a wrong-area visit
 * is redirected without a flash of content, but the API is the real gate.
 *
 * - not signed in -> /sign-in
 * - wrong role, or a student who has not onboarded -> the account's home
 *   page from the API (`/me` returns `home`)
 *
 * The account is read from the auth provider, not fetched here: one `/me` per
 * page load, no matter how many components guard themselves.
 */
export function usePanelGuard(roles: UserRole[]) {
  const { ready, signedIn, user, loading, error } = useAuth();
  const router = useRouter();

  let redirectTo: string | null = null;
  if (ready && !signedIn) redirectTo = "/sign-in";
  else if (user) {
    /*
     * A role is the approval. `pending` only holds an account back when it has
     * no role yet; a seeded or admin-assigned account (the first super admin)
     * lands in its own panel. `user.home` already encodes this.
     */
    if (!user.role || !roles.includes(user.role)) {
      redirectTo = webHomeFor(user.home);
    } else if (user.role === "student" && !user.onboarded) {
      redirectTo = "/onboarding/parent";
    }
  }

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  const denied = redirectTo !== null;
  // Nothing to render until we know whether this account may be here.
  const isLoading = !ready || (signedIn && !user && !error) || loading;
  const allowed = !denied && Boolean(user);

  return { user, allowed, denied, isLoading, error };
}

/**
 * The public entry pages. A signed-in visitor is sent to their own panel
 * instead of being shown a sign-in form they do not need.
 */
const PUBLIC_ENTRY_PAGES = ["/", "/mobile", "/sign-in", "/sign-up"];

function isPublicEntryPage(pathname: string) {
  return PUBLIC_ENTRY_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );
}

/**
 * Keep authenticated visitors out of the public entry pages.
 *
 * This is the same rule as `usePanelGuard`'s "wrong area" branch, so it lives
 * here next to it: one place decides where an account goes. The destination
 * goes through `webHomeFor`, so a parent lands on the link page rather than
 * the children dashboard (see `lib/role-home.ts`).
 */
export function usePublicPageRedirect() {
  const { ready, signedIn, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !signedIn || !user) return;
    if (isPublicEntryPage(pathname)) router.replace(webHomeFor(user.home));
  }, [ready, signedIn, user, pathname, router]);
}

export function PanelLoading() {
  return <PanelSkeleton />;
}

/**
 * Renders children only once the guard has passed.
 *
 * `denied` means a redirect is on its way (still signed in, wrong area or
 * status), so the spinner is honest. Without it the API refused the account
 * while the redirect does not apply: saying so beats a permanent "Loading...".
 */
export function Guarded({
  allowed,
  denied = false,
  isLoading,
  error,
  children,
}: {
  allowed: boolean;
  denied?: boolean;
  isLoading: boolean;
  /** A failed `/me` load, as opposed to a policy refusal. */
  error?: string | null;
  children: ReactNode;
}) {
  if (isLoading || denied) return <PanelLoading />;
  if (!allowed) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {error
            ? "We could not load your account."
            : "This area is not available yet."}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error ?? "Your account may be waiting for approval."}
        </p>
        <a
          href="/pending"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Check your status
        </a>
      </div>
    );
  }
  return <>{children}</>;
}

/** For a page that only needs a signed-in visitor: sign in first. */
export function useSignedInOnly() {
  const { ready, signedIn, user, loading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !signedIn) router.replace("/sign-in");
  }, [ready, signedIn, router]);

  return {
    user,
    error,
    isLoading: !ready || loading || (signedIn && !user && !error),
  };
}
