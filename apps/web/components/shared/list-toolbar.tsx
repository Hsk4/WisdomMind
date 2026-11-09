"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  /** Key the page reads from `useListState().filters`. */
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
}

interface ListToolbarProps {
  searchPlaceholder?: string;
  /** Controlled by `useListState`; typing is debounced by the hook. */
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: FilterConfig[];
  onFilterChange?: (id: string, value: string) => void;
  /** True when any filter/search is set, so "Clear" is worth showing. */
  hasActiveFilters?: boolean;
  onClear?: () => void;
  className?: string;
  /** Buttons that belong beside the filters (e.g. "Add user"). */
  children?: React.ReactNode;
}

/**
 * The list toolbar, as a controlled client component.
 *
 * It used to be a native GET `<form>`: every Apply was a full page load, and
 * in the Capacitor build a navigation to a path outside the static export
 * bounced the user to sign-in. Now the page owns the state (`useListState`),
 * the search debounces, and a select applies on change — no submit, no reload.
 */
export function ListToolbar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters = [],
  onFilterChange,
  hasActiveFilters = false,
  onClear,
  className,
  children,
}: ListToolbarProps) {
  return (
    <div
      role="search"
      className={
        className ??
        "fastly-card flex flex-col gap-3 bg-card p-4 md:flex-row md:items-center md:justify-between"
      }
    >
      <div className="relative w-full md:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          /* 44px on a phone: the kit's minimum touch height. */
          className="h-11 pl-9 md:h-10"
          aria-label={searchPlaceholder}
        />
      </div>

      {/*
       * On a phone the filters scroll sideways in one row instead of wrapping
       * into a stack of full-width selects, which pushed the table below the
       * fold. The third select is therefore cut at the right edge by design, so
       * a fade marks it as scrollable. From `md` the wrapper steps aside
       * (`contents`) and the filters wrap normally.
       */}
      <div className="relative md:contents">
        <div className="quiet-scroll -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          {filters.map((filter) => (
            <select
              key={filter.id}
              id={`f-${filter.id}`}
              value={filter.value}
              onChange={(event) =>
                onFilterChange?.(filter.id, event.target.value)
              }
              aria-label={filter.label}
              className="input h-11 w-[150px] shrink-0 md:h-10"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}

          {hasActiveFilters && onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 shrink-0 text-muted-foreground md:h-9"
              onClick={onClear}
            >
              <X />
              Clear
            </Button>
          ) : null}

          {children}
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden"
        />
      </div>
    </div>
  );
}
