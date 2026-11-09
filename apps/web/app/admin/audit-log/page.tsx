"use client";

import type { AuditLogResponse } from "@lms/shared";
import { useAsync } from "@/lib/use-async";
import { api } from "@/lib/api-client";
import { useListState } from "@/lib/use-list-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { DataTableView } from "@/components/shared/data-table-view";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { Pagination } from "@/components/shared/pagination";
import { PageHeader, formatDate } from "@/components/ui/nila";

const PAGE_SIZE = 25;

/**
 * The audit trail, as sentences.
 *
 * The API already words each row (`action`, `target`, `changes`), so this page
 * is a plain table: no JSON, no ids, no client-side interpretation. The
 * `actions` list comes with the response, so the dropdown can only offer
 * filters that will match something.
 */
export default function AuditLogPage() {
  const list = useListState(["action"]);
  const action = list.filters.action;

  const auditQuery = useAsync(
    () =>
      api.get<AuditLogResponse>("/admin/audit-log", {
        q: list.search,
        action,
        page: list.page,
        pageSize: PAGE_SIZE,
      }),
    [list.search, action, list.page],
  );

  const entries = auditQuery.data?.entries ?? [];
  const total = auditQuery.data?.total ?? 0;
  const page = auditQuery.data?.page ?? 1;
  const pageCount = auditQuery.data?.pageCount ?? 1;
  const actions = auditQuery.data?.actions ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit log"
        description="Append only. Newest first. Every change an admin or the system made."
      />

      <DataTableView
        toolbar={
          <ListToolbar
            searchPlaceholder="Search by person or target"
            searchValue={list.searchInput}
            onSearchChange={list.setSearchInput}
            onFilterChange={list.setFilter}
            hasActiveFilters={list.hasActiveFilters}
            onClear={list.clear}
            filters={[
              {
                id: "action",
                label: "Action",
                value: action,
                options: [
                  { value: "", label: "Any action" },
                  ...actions.map((item) => ({
                    value: item.key,
                    label: item.label,
                  })),
                ],
              },
            ]}
          />
        }
        footer={
          <Pagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={list.setPage}
          />
        }
        loading={auditQuery.loading && entries.length === 0}
        refreshing={auditQuery.loading && entries.length > 0}
        empty={entries.length === 0}
        emptyTitle="No entries match"
        emptyDescription="Try a different search, or clear the filters."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>What</TableHead>
              <TableHead className="hidden md:table-cell">About</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(entry.at)}
                </TableCell>
                <TableCell className="text-sm">
                  <p className="font-medium">{entry.actor}</p>
                  {entry.actorRole ? (
                    <p className="text-xs capitalize text-muted-foreground">
                      {entry.actorRole.replace("_", " ")}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm">{entry.action}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {entry.target}
                </TableCell>
                <TableCell>
                  {entry.changes.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <ul className="flex flex-wrap gap-1">
                      {entry.changes.map((change) => (
                        <li
                          key={`${change.label}-${change.from}-${change.to}`}
                          className="chip border-border bg-surface text-[11px] font-normal normal-case tracking-normal text-muted-foreground"
                        >
                          <span className="font-medium text-foreground">
                            {change.label}
                          </span>
                          {change.from ? (
                            <>
                              {": "}
                              <span className="line-through">
                                {change.from}
                              </span>
                            </>
                          ) : null}
                          {change.to ? (
                            <>
                              {" → "}
                              <span className="text-foreground">
                                {change.to}
                              </span>
                            </>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableView>
    </div>
  );
}
