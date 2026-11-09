"use client";

import { PanelShell } from "@/components/shell/panel-shell";
import { PARENT_NAV_GROUPS } from "@/components/shell/nav-config";
import { Guarded, usePanelGuard } from "@/lib/guards";

/**
 * Coarse guard for the parent area. Parents are read-only: every page filters
 * to the children linked through `guardianships`. On phones the reference kit
 * uses a bottom tab bar instead of a slide-over, so `mobile` says so.
 *
 * A super admin is allowed in as well: the link-code endpoint accepts one test
 * use of a code (after or before the parent), and the office needs a screen to
 * spend it from.
 */
export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, allowed, denied, isLoading, error } = usePanelGuard([
    "parent",
    "super_admin",
  ]);

  return (
    <Guarded
      allowed={allowed}
      denied={denied}
      isLoading={isLoading}
      error={error}
    >
      <PanelShell
        panel="parent"
        groups={PARENT_NAV_GROUPS}
        mobile="bottom-tabs"
        user={{
          name: user?.name ?? "",
          email: user?.email ?? "",
          role: user?.role ?? null,
          status: user?.status ?? "pending",
        }}
      >
        {children}
      </PanelShell>
    </Guarded>
  );
}
