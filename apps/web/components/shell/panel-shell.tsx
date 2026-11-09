"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/brand/primitives";
import { navIcon } from "@/components/shell/nav-icons";
import {
  findNavItem,
  isNavItemActive,
  mobileTabItems,
  PANEL_LABEL,
  type NavBadgeKey,
  type NavGroup,
} from "@/components/shell/nav-config";
import { MobileNavSheet } from "@/components/shell/mobile-nav-sheet";
import { PageActions, ThemeToggle } from "@/components/shell/page-actions";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { NotificationsDrawer } from "@/components/shared/notifications-drawer";
import { cn } from "@/lib/utils";

export interface PanelShellProps {
  panel: "admin" | "student" | "teacher" | "parent";
  groups: NavGroup[];
  user: { name: string; email: string; role: string | null; status: string };
  badges?: Partial<Record<NavBadgeKey, number>>;
  /** Optional secondary badge under the avatar name (level, class …). */
  hint?: string;
  /**
   * Below `lg` every panel gets the five-item bottom tab bar from the brand
   * kit's App-Home screen: four destinations from `MOBILE_TABS` and a "More"
   * tab that opens the full grouped nav in a sheet. `sheet` keeps the old
   * hamburger-only header for a panel that wants it.
   */
  mobile?: "sheet" | "bottom-tabs";
  children: React.ReactNode;
}

/**
 * One responsive frame for every panel: navy sidebar from `lg`, a navy topbar
 * whose subtitle follows the panel, and a mobile nav.
 *
 * The topbar and sidebar are the fixed brand navy, so their contents use the
 * `on-navy` tokens rather than `--foreground` and stay readable in dark mode.
 */
export function PanelShell({
  panel,
  groups,
  user,
  badges,
  hint,
  mobile = "sheet",
  children,
}: PanelShellProps) {
  const pathname = usePathname();
  const current = findNavItem(pathname, groups);
  const label = PANEL_LABEL[panel];
  const title = current?.label ?? label.subtitle;

  const pendingBadge = badges?.pending ?? 0;
  const notifications =
    pendingBadge > 0
      ? [
          {
            id: "pending",
            title: `${pendingBadge} pending request${pendingBadge === 1 ? "" : "s"}`,
            body: "Open the requests queue to review them.",
            href: panel === "admin" ? "/admin/requests" : undefined,
          },
        ]
      : [];

  const flatItems = groups.flatMap((group) => group.items);
  // Four destinations plus "More": five is what fits a thumb-width tab.
  const bottomItems = mobileTabItems(panel, groups).slice(0, 4);
  const hasBottomTabs = mobile === "bottom-tabs";

  return (
    <div className="flex min-h-screen bg-background">
      {/*
       * The nav itself is `sticky h-screen`, so on a long page it stays put
       * while the content scrolls. The column carries the same navy so the
       * space below the nav reads as part of the sidebar instead of a stray
       * block of background.
       */}
      <aside className="fastly-sidebar hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarNav panel={panel} groups={groups} badges={badges} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="fastly-topbar sticky top-0 z-30">
          <div className="relative">
            <span
              className="fastly-jaali pointer-events-none absolute inset-0 opacity-70"
              aria-hidden="true"
            />
            <div className="relative flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
              {hasBottomTabs ? (
                <Link
                  href={`/${panel}`}
                  className="flex h-11 w-11 items-center justify-center lg:hidden"
                  aria-label={`${label.name} home`}
                >
                  <BrandMark size={28} tone="light" />
                </Link>
              ) : (
                <MobileNavSheet panel={panel} groups={groups} badges={badges} />
              )}

              {/*
               * The page body owns the <h1> (its PageHeader); this bar is a way
               * back and a breadcrumb. Rendering the route name here too printed
               * "Users / Users" on every page.
               */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {label.subtitle}
                </p>
                {/*
                 * Desktop only. On a phone there is no sidebar, so this is
                 * where the section name would come from — but the page's own
                 * <h1> sits directly underneath and says exactly the same
                 * thing ("Student panel / My courses" above "My courses"). The
                 * tab bar already marks the section, so the second line only
                 * adds noise where vertical space is scarcest.
                 */}
                {current ? (
                  <p className="hidden truncate text-xs text-on-navy-soft lg:block">
                    {title}
                  </p>
                ) : null}
              </div>

              {/*
               * The theme toggle is a one-tap control on a phone. It used to
               * sit here and was moved into the account menu to save width;
               * that made a daily-ish choice two taps deep, so it is back —
               * the header has room now that the second nav row is gone.
               */}
              <span className="lg:hidden">
                <ThemeToggle tone="onNavy" />
              </span>

              {notifications.length ? (
                <NotificationsDrawer items={notifications} />
              ) : null}

              {/*
               * On a phone the theme control lives in the account menu: three
               * 44px circles plus the avatar do not fit a 360px header, and
               * the theme is a once-in-a-while choice, not a daily one.
               */}
              <span className="hidden lg:block">
                <PageActions user={user} />
              </span>
              <span className="lg:hidden">
                <UserMenu name={user.name} email={user.email} hint={hint} />
              </span>
            </div>

            {!hasBottomTabs ? (
              /*
               * The strip scrolls sideways on a phone. Without a hint the last
               * visible item looks like the end of the list, so a fade on the
               * right edge says "there is more this way".
               */
              <div className="relative lg:hidden">
              <nav
                aria-label="Sections"
                className="quiet-scroll relative flex gap-1 overflow-x-auto border-t-[1.5px] border-on-navy-line px-3 py-2"
              >
                {flatItems.map((item) => {
                  const active = isNavItemActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-tint text-cobalt"
                          : "text-on-navy-soft hover:bg-white/8 hover:text-white",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--fastly-navy)] to-transparent"
              />
              </div>
            ) : null}
          </div>
        </header>

        <main
          className={cn(
            "flex-1 px-3 py-5 sm:px-6 sm:py-6 lg:px-8",
            hasBottomTabs ? "pb-28 lg:pb-10" : "",
          )}
        >
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      {hasBottomTabs ? (
        <nav
          aria-label="Sections"
          className="fixed inset-x-0 bottom-0 z-30 border-t-[1.5px] border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <ul className="flex items-stretch px-1 pt-1.5">
            {bottomItems.map((item) => {
              const Icon = navIcon(item.icon);
              const active = isNavItemActive(pathname, item);
              const badge = item.badgeKey ? (badges?.[item.badgeKey] ?? 0) : 0;
              return (
                <li key={item.href} className="flex flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("fastly-tab", active && "fastly-tab-active")}
                  >
                    <span className="relative">
                      <Icon
                        size={19}
                        strokeWidth={active ? 2.1 : 1.7}
                        aria-hidden="true"
                      />
                      {badge > 0 ? (
                        <span
                          className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-navy"
                          aria-label={`${badge} waiting`}
                        >
                          {badge > 9 ? "9+" : badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="max-w-full truncate">
                      {item.shortLabel ?? item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
            <li className="flex flex-1">
              <MobileNavSheet
                panel={panel}
                groups={groups}
                badges={badges}
                trigger="more"
              />
            </li>
          </ul>
          <div className="fastly-safe-gap" aria-hidden="true" />
        </nav>
      ) : null}
    </div>
  );
}
