"use client";

import { useAsync } from "@/lib/use-async";
import { api, errorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
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
import { StatStrip } from "@/components/shared/stat-strip";
import { ErrorState } from "@/components/shared/error-state";
import {
  PageHeader,
  RoleChip,
  StatusChip,
  formatDay,
} from "@/components/ui/nila";
import { UserRowActions } from "./user-row-actions";

const STATUSES = ["", "pending", "active", "rejected", "suspended"];
const PAGE_SIZE = 25;

/**
 * Role tabs. "All" is the default; the rest narrow the same list, so the
 * office can answer "who are the parents?" without a dropdown.
 */
const ROLE_TABS = [
  { value: "", label: "All" },
  { value: "student", label: "Students" },
  { value: "parent", label: "Parents" },
  { value: "teacher", label: "Teachers" },
  { value: "admin", label: "Admins" },
] as const;

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  status: string;
  onboarded: boolean;
  createdAt: string;
  board?: string;
  level?: string;
};

type UsersResponse = {
  total: number;
  page: number;
  pageCount: number;
  counts: { all: number; active: number; pending: number; teachers: number };
  users: UserRow[];
};

type CatalogLists = {
  boards: { id: string; name: string }[];
  levels: { id: string; name: string }[];
};

/**
 * The list is paged by the API from Postgres. Search, filters and the page
 * live in `useListState`, so a filter click is a re-render — never a page
 * load, which the Capacitor build cannot serve.
 */
export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const list = useListState(["status", "role", "boardId", "levelId"]);
  const { status, role, boardId, levelId } = list.filters;

  const usersQuery = useAsync(
    () =>
      api.get<UsersResponse>("/admin/users", {
        status,
        role,
        boardId,
        levelId,
        q: list.search,
        page: list.page,
        pageSize: PAGE_SIZE,
      }),
    [status, role, boardId, levelId, list.search, list.page],
  );
  const catalogQuery = useAsync(
    () => api.get<CatalogLists>("/admin/catalog"),
    [],
  );

  const counts = usersQuery.data?.counts ?? {
    all: 0,
    active: 0,
    pending: 0,
    teachers: 0,
  };
  const total = usersQuery.data?.total ?? 0;
  const page = usersQuery.data?.page ?? 1;
  const pageCount = usersQuery.data?.pageCount ?? 1;
  const users = usersQuery.data?.users ?? [];
  const boards = catalogQuery.data?.boards ?? [];
  const levels = catalogQuery.data?.levels ?? [];

  const actorRole = me?.role ?? null;
  const canManage = (targetRole: string | null) =>
    targetRole !== "super_admin" &&
    (targetRole !== "admin" || actorRole === "super_admin");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Suspend, reinstate or open an account."
      />

      <StatStrip
        items={[
          { label: "Users", value: counts.all },
          { label: "Active", value: counts.active },
          {
            label: "Awaiting approval",
            value: counts.pending,
            hint: counts.pending ? "Review on Requests" : "Queue clear",
          },
          { label: "Teachers", value: counts.teachers },
        ]}
      />

      {/* Role tabs: one click to the group the office is looking for. */}
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filter users by role"
      >
        {ROLE_TABS.map((tab) => {
          const active = role === tab.value;
          return (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => list.setFilter("role", tab.value)}
              aria-pressed={active}
              className={`chip h-8 px-3 transition-colors duration-150 ${
                active
                  ? "border-primary bg-tint text-tint-foreground"
                  : "border-border text-muted-foreground hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {usersQuery.error && users.length === 0 ? (
        <ErrorState
          description={errorMessage(
            usersQuery.error,
            "We could not load the user list right now.",
          )}
          onRetry={usersQuery.reload}
        />
      ) : (
        <DataTableView
          toolbar={
            <ListToolbar
              searchPlaceholder="Search name or email"
              searchValue={list.searchInput}
              onSearchChange={list.setSearchInput}
              onFilterChange={list.setFilter}
              hasActiveFilters={list.hasActiveFilters}
              onClear={list.clear}
              filters={[
                {
                  id: "status",
                  label: "Status",
                  value: status,
                  options: STATUSES.map((value) => ({
                    value,
                    label: value || "Any status",
                  })),
                },
                {
                  id: "boardId",
                  label: "Board",
                  value: boardId,
                  options: [
                    { value: "", label: "Any board" },
                    ...boards.map((board) => ({
                      value: board.id,
                      label: board.name,
                    })),
                  ],
                },
                {
                  id: "levelId",
                  label: "Level",
                  value: levelId,
                  options: [
                    { value: "", label: "Any level" },
                    ...levels.map((level) => ({
                      value: level.id,
                      label: level.name,
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
          loading={usersQuery.loading && users.length === 0}
          refreshing={usersQuery.loading && users.length > 0}
          empty={users.length === 0}
          emptyTitle="No users match"
          emptyDescription="Try a different search or clear the filters."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">
                  Board / level
                </TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    <RoleChip role={user.role} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={user.status} />
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {/* Board and level only mean something for a student. */}
                    {user.role === "student"
                      ? [user.board, user.level].filter(Boolean).join(" / ") ||
                        "—"
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {formatDay(user.createdAt)}
                  </TableCell>
                  <TableCell className="w-px whitespace-nowrap text-end">
                    <UserRowActions
                      userId={user.id}
                      name={user.name}
                      role={user.role}
                      status={user.status}
                      canManage={canManage(user.role)}
                      onDone={usersQuery.reload}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableView>
      )}
    </div>
  );
}
