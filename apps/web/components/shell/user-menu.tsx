"use client";

import * as React from "react";
import { LogOut, Settings, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { readStoredUser } from "@/lib/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export interface UserMenuProps {
  name: string;
  email: string;
  /**
   * Kept for callers that pass role/level/class. The header shows the avatar
   * only; the hint belongs inside the menu if it is ever needed there.
   */
  hint?: string;
  /** Extra items rendered above Sign out (e.g. the theme menu on a phone). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Avatar dropdown from the reference kit: account details, sign-out, and any
 * panel-specific actions passed as children.
 *
 * Sign-out lives here rather than in a second avatar button beside it. Two
 * identical initials circles sat side by side in the header, and the menu had
 * to explain "sign out with the avatar button" to tell them apart.
 */
export function UserMenu({
  name,
  email,
  hint,
  children,
  className,
}: UserMenuProps) {
  const { signOut } = useAuth();
  const onSignOut = () => signOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
          aria-label={`Account menu for ${name}`}
        >
          <Avatar className="h-10 w-10 border border-border sm:h-9 sm:w-9">
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          {/* The name lives in the dropdown; the header only needs the avatar. */}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold normal-case tracking-normal text-foreground">
            {name}
          </span>
          <span className="block truncate text-xs font-normal normal-case tracking-normal text-muted-foreground">
            {email}
          </span>
          {hint ? (
            <span className="block truncate text-xs font-normal normal-case tracking-normal text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserRound />
          Signed in
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings />
          Account settings
        </DropdownMenuItem>
        {children ? (
          <>
            <DropdownMenuSeparator />
            {children}
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The plain initials button used by the shells that are not the full panel
 * (gate pages and the signed-in `Shell`). The panel itself uses `UserMenu`
 * above, which carries the same sign-out plus the account details.
 */
export function UserButton() {
  const { signOut } = useAuth();
  const user = readStoredUser();
  const initials =
    (user?.name ?? "User")
      .split(" ")
      .map((part: string) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A";

  return (
    <button
      type="button"
      onClick={() => {
        // The provider clears the session and navigates. Pages reload their own
        // data on mount, so nothing from this account can leak to the next.
        signOut();
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
      aria-label="Sign out"
      title={
        user?.email ? `${user.name ?? "User"} • ${user.email}` : "Sign out"
      }
    >
      {initials}
    </button>
  );
}

/** The role/status pills shown next to the avatar in the topbar. */
export function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <Badge variant="secondary">No role</Badge>;
  return (
    <Badge variant={role === "super_admin" ? "default" : "secondary"}>
      {role.replace("_", " ")}
    </Badge>
  );
}
