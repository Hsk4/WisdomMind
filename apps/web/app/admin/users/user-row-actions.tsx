"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  LockOpen,
  MoreHorizontal,
  ShieldOff,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, errorMessage } from "@/lib/api-client";

/**
 * One menu per row: open, suspend/reinstate, and — for a parent — unlock the
 * phone the account is bound to.
 *
 * The actions used to be spread over the detail page and an expanding row.
 * A menu keeps the list scannable and puts every action for one account in
 * one place. Each action confirms first, because none of them is undoable
 * from this screen.
 */
export function UserRowActions({
  userId,
  name,
  role,
  status,
  canManage,
  onDone,
}: {
  userId: string;
  name: string;
  role: string | null;
  status: string;
  /** False for a protected account (another admin, or the super admin). */
  canManage: boolean;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setPending(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (caught) {
      setError(errorMessage(caught, "That did not work"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? (
        <span
          className="max-w-[16rem] truncate text-xs text-status-red"
          title={error}
        >
          {error}
        </span>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Actions for ${name}`}
            disabled={pending}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{name}</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/admin/users/detail?id=${userId}`}>
              <ArrowUpRight />
              Open
            </Link>
          </DropdownMenuItem>

          {canManage ? (
            <>
              <DropdownMenuSeparator />
              {status === "suspended" ? (
                <DropdownMenuItem
                  onSelect={() =>
                    void run(
                      () => api.post(`/admin/users/${userId}/reinstate`),
                      `Reinstate ${name}? They will be able to sign in again.`,
                    )
                  }
                >
                  <ShieldCheck />
                  Reinstate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-status-red focus:text-status-red"
                  onSelect={() =>
                    void run(
                      () => api.post(`/admin/users/${userId}/suspend`),
                      `Suspend ${name}? They lose access immediately.`,
                    )
                  }
                >
                  <ShieldOff />
                  Suspend
                </DropdownMenuItem>
              )}

              {role === "parent" ? (
                <DropdownMenuItem
                  onSelect={() =>
                    void run(
                      () => api.post(`/admin/users/${userId}/device/reset`),
                      `Unlock ${name}'s phone? The next sign-in binds whatever phone it comes from, and the current phone is signed out.`,
                    )
                  }
                >
                  <LockOpen />
                  Unlock phone
                </DropdownMenuItem>
              ) : null}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
