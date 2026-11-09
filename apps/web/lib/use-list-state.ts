"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Filter, search and page state for a list, held in React state.
 *
 * The lists used to keep this in the URL and re-render the page on every
 * submit. That is a full navigation, and in the Capacitor build a navigation
 * to a static export path that is not in the bundle bounces the user back to
 * sign-in. Keeping the state here means a filter click is a re-render, never a
 * page load.
 *
 * `search` is debounced (300 ms) so typing does not fire a request per key;
 * selects apply immediately. Any change resets the page to 1, because page 4
 * of the old filter is rarely page 4 of the new one.
 */

export type ListState = {
  /** The debounced search text, safe to send to the API. */
  search: string;
  /** What the input shows right now. */
  searchInput: string;
  setSearchInput: (value: string) => void;
  /** Current values of the named filters. */
  filters: Record<string, string>;
  setFilter: (id: string, value: string) => void;
  page: number;
  setPage: (page: number) => void;
  /** True when a search or filter is set. */
  hasActiveFilters: boolean;
  /** Back to page 1 with no search and no filters. */
  clear: () => void;
};

export function useListState(
  filterIds: readonly string[] = [],
  { debounceMs = 300 }: { debounceMs?: number } = {},
): ListState {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(() =>
    Object.fromEntries(filterIds.map((id) => [id, ""])),
  );
  const [page, setPageState] = useState(1);

  // The debounce timer is reset on every keystroke; the last one wins.
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPageState(1);
    }, debounceMs);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [searchInput, debounceMs]);

  const setFilter = useCallback((id: string, value: string) => {
    setFilters((current) =>
      current[id] === value ? current : { ...current, [id]: value },
    );
    setPageState(1);
  }, []);

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next));
  }, []);

  const clear = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setFilters(Object.fromEntries(filterIds.map((id) => [id, ""])));
    setPageState(1);
    // `filterIds` is a literal at every call site; re-creating the callback
    // when it changes is harmless and keeps the closure honest.
  }, [filterIds]);

  const hasActiveFilters =
    search.length > 0 || Object.values(filters).some(Boolean);

  return useMemo(
    () => ({
      search,
      searchInput,
      setSearchInput,
      filters,
      setFilter,
      page,
      setPage,
      hasActiveFilters,
      clear,
    }),
    [
      search,
      searchInput,
      filters,
      setFilter,
      page,
      setPage,
      hasActiveFilters,
      clear,
    ],
  );
}
