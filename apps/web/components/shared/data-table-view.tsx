import * as React from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

interface DataTableViewProps {
  /** Rendered above the table, outside the border (search + filters). */
  toolbar?: React.ReactNode;
  /** Rendered under the table (pagination, totals). */
  footer?: React.ReactNode;
  empty?: boolean;
  /**
   * The first load is still in flight. Without this a page that passes
   * `empty={rows.length === 0}` shows "nothing here" for a second before the
   * rows arrive, which reads as "your data is gone".
   */
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyAction?: React.ReactNode;
  /**
   * A reload is in flight while rows are already on screen. The rows stay
   * visible (dimmed) instead of flashing back to the skeleton, which reads as
   * "your data is gone" for a second.
   */
  refreshing?: boolean;
  className?: string;
  /** The `<Table>` itself. */
  children?: React.ReactNode;
}

/**
 * The list-page layout from the reference kit: toolbar, bordered table card,
 * empty state, pagination — stacked with one gap so each surface reads as its
 * own layer.
 *
 * Why not the reference's generic `columns`/`rows`/`loading`/`error` component:
 * those pages fetched client-side, so the table had to own loading and failure
 * itself. A server component has already resolved both by the time it renders —
 * a thrown query becomes the route's `error.tsx`, a slow one becomes
 * `loading.tsx`. Reproducing that state machine here would mean shipping client
 * state for states that can never occur, so the page keeps writing real
 * `<Table>` markup (cell content varies too much per domain) and this supplies
 * the frame. Pages that genuinely load late can drop `<LoadingSkeleton>` or
 * `<ErrorState>` in as children.
 */
export function DataTableView({
  toolbar,
  footer,
  empty = false,
  loading = false,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  refreshing = false,
  className,
  children,
}: DataTableViewProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {toolbar}
      {loading ? (
        <div
          className="fastly-card bg-card p-6"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="space-y-3">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="h-9 animate-pulse rounded-md bg-muted"
                style={{ opacity: 1 - row * 0.18 }}
              />
            ))}
          </div>
          <span className="sr-only">Loading</span>
        </div>
      ) : empty ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={emptyIcon}
          action={emptyAction}
        />
      ) : (
        <div
          className={cn(
            /*
             * `fastly-card` is the brand's 1.5px hairline card. The table
             * inside scrolls sideways on a phone, so the corners are clipped
             * here rather than by `overflow-hidden` on the card itself (which
             * would also clip the sticky header's shadow-free edge).
             */
            "fastly-card relative overflow-hidden bg-card transition-opacity",
            refreshing && "opacity-60",
          )}
          aria-busy={refreshing || undefined}
        >
          {children}
          {/*
           * On a phone the last column is often half off-screen. The fade is
           * the cue that the table continues; without it a clipped "Status"
           * column reads as a broken layout, not as a table you can swipe.
           */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card to-transparent lg:hidden"
          />
        </div>
      )}
      {footer}
    </div>
  );
}
