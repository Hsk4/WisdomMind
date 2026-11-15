"use client";

import type { ReactNode } from "react";
import { Providers } from "@/lib/providers";
import { ApiBaseUrlCheck } from "@/lib/api-base-check";
import { usePublicPageRedirect } from "@/lib/guards";

/**
 * Root client shell: the session and school providers, the build-time API
 * check, and the rule that sends a signed-in visitor off the public entry
 * pages (the rule itself lives in `lib/guards.tsx`).
 */
export function RootShell({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <ApiBaseUrlCheck />
      <PublicPageRedirect />
      {children}
    </Providers>
  );
}

/** Non-visual: renders nothing, redirects when the visitor already has a session. */
function PublicPageRedirect() {
  usePublicPageRedirect();
  return null;
}
