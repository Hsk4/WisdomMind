"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Client-side search, filters and paging for a list the API returns whole.
 *
 * Some endpoints (books, materials, enrollments, invoices, support tickets)
 * return every row; the page then has to make that list usable. This is the
 * same shape as `useListState`, but it never touches the network: it filters
 * the array it was given and slices one page out of it.
 *
 * `searchText` says which fields the search box looks at, so a row is found by
 * the words a person would type (a student's name, a course label) rather than
 * by its id.
 */

export type TableControls<T> = {
  /** The rows on the current page. */
  rows: T[];
  /** Rows after search and filters, before paging. */
  matched: number;
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
  searchInput: string;
  setSearchInput: (value: string) => void;
  filters: Record<string, string>;
  setFilter: (id: string, value: string) => void;
  hasActiveFilters: boolean;
  clear: () => void;
};

export function useTableControls<T>(
  items: T[],
  {
    searchText,
    filterIds = [],
    filters: filterFns = {},
    pageSize = 20,
  }: {
    /** The text a row is matched on. */
    searchText: (item: T) => string;
    filterIds?: readonly string[];
    /** Optional per-filter predicate; a filter with no predicate is ignored. */
    filters?: Record<string, (item: T, value: string) => boolean>;
    pageSize?: number;
  },
): TableControls<T> {
  const [searchInput, setSearchInputState] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(() =>
    Object.fromEntries(filterIds.map((id) => [id, ""])),
  );
  const [page, setPageState] = useState(1);

  const setSearchInput = useCallback((value: string) => {
    setSearchInputState(value);
    setPageState(1);
  }, []);

  const setFilter = useCallback((id: string, value: string) => {
    setFilters((current) =>
      current[id] === value ? current : { ...current, [id]: value },
    );
    setPageState(1);
  }, []);

  const clear = useCallback(() => {
    setSearchInputState("");
    setFilters(Object.fromEntries(filterIds.map((id) => [id, ""])));
    setPageState(1);
  }, [filterIds]);

  const filtered = useMemo(() => {
    const needle = searchInput.trim().toLowerCase();
    return items.filter((item) => {
      if (needle && !searchText(item).toLowerCase().includes(needle)) {
        return false;
      }
      for (const [id, value] of Object.entries(filters)) {
        if (!value) continue;
        const predicate = filterFns[id];
        if (predicate && !predicate(item, value)) return false;
      }
      return true;
    });
    // `searchText` and `filterFns` are inline closures at every call site; the
    // values they read are the item and the filter, both in the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchInput, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next));
  }, []);

  return {
    rows,
    matched: filtered.length,
    page: safePage,
    pageCount,
    setPage,
    searchInput,
    setSearchInput,
    filters,
    setFilter,
    hasActiveFilters:
      searchInput.trim().length > 0 || Object.values(filters).some(Boolean),
    clear,
  };
}
