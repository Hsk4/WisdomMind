"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./auth-context";
import { SiteSettingsProvider } from "./site-settings";

/**
 * Root client providers.
 *
 * There is no global data cache: the session lives in `AuthProvider`, the
 * school's identity in `SiteSettingsProvider`, and every screen owns the data
 * it fetches (`lib/use-async.ts`). "Which request runs when" is answerable by
 * reading the page.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SiteSettingsProvider>
      <AuthProvider>{children}</AuthProvider>
    </SiteSettingsProvider>
  );
}
