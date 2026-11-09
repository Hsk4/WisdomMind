"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize?: number;
  /** Called with the page the user picked. The page owns the state. */
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Pagination as buttons, not links.
 *
 * The links were real `<a href>`s, so every page change was a full navigation —
 * which the Capacitor static export cannot serve, and which bounced the user
 * to sign-in. The list state lives in `useListState` now, so paging is a
 * re-render and the filters stay exactly where they were.
 */
export function Pagination({
  page,
  pageCount,
  totalItems,
  pageSize = 20,
  onPageChange,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  // A window of at most five pages that always contains the current one.
  const windowSize = Math.min(5, pageCount);
  const start = Math.min(
    Math.max(1, page - Math.floor(windowSize / 2)),
    pageCount - windowSize + 1,
  );
  const pages = Array.from({ length: windowSize }, (_, i) => start + i);

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        "fastly-card flex flex-col items-center justify-between gap-3 bg-card p-3 sm:flex-row sm:p-4",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span>
      </p>

      {/*
       * 44px targets on a phone, 36px from `sm`. The numbered buttons are
       * hidden below `sm` — five 44px squares plus the arrows do not fit a
       * 360px screen — and the "Page 2 of 7" line takes their place.
       */}
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 sm:h-9 sm:w-9"
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-2 text-sm text-muted-foreground sm:hidden">
          Page {page} of {pageCount}
        </span>

        <span className="hidden items-center gap-1 sm:flex">
          {pages.map((pageNumber) => (
            <Button
              key={pageNumber}
              type="button"
              size="icon"
              variant={pageNumber === page ? "default" : "ghost"}
              className="h-9 w-9"
              aria-current={pageNumber === page ? "page" : undefined}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </Button>
          ))}
        </span>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 sm:h-9 sm:w-9"
          disabled={page >= pageCount}
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}
