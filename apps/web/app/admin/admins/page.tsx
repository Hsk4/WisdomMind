"use client";

import { useAsync } from "@/lib/use-async";
import { api } from "@/lib/api-client";
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
import { ActionForm } from "@/components/ui/action-form";
import { Input } from "@/components/ui/input";
import {
  PageHeader,
  Card,
  RoleChip,
  StatusChip,
  formatDay,
} from "@/components/ui/nila";
import { Guarded, usePanelGuard } from "@/lib/guards";
import { UserRowActions } from "../users/user-row-actions";

const PAGE_SIZE = 25;

type AdminRow = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  status: string;
  onboarded: boolean;
  createdAt: string;
};

type UsersResponse = {
  total: number;
  page: number;
  pageCount: number;
  users: AdminRow[];
};

/**
 * Super admin only: the administrator accounts, and the form that adds one.
 *
 * The API refuses every call here for an ordinary admin (`requireRole`), so
 * the guard is UX — it keeps a wrong-area visit from flashing the page.
 */
export default function AdminsPage() {
  const { allowed, denied, isLoading, error } = usePanelGuard(["super_admin"]);
  const { user: me } = useAuth();
  const list = useListState(["role"]);
  const role = list.filters.role;

  const adminsQuery = useAsync(
    () =>
      api.get<UsersResponse>("/admin/users", {
        role,
        q: list.search,
        page: list.page,
        pageSize: PAGE_SIZE,
      }),
    [role, list.search, list.page],
    { enabled: allowed },
  );

  const admins = adminsQuery.data?.users ?? [];
  const total = adminsQuery.data?.total ?? 0;
  const page = adminsQuery.data?.page ?? 1;
  const pageCount = adminsQuery.data?.pageCount ?? 1;

  return (
    <Guarded
      allowed={allowed}
      denied={denied}
      isLoading={isLoading}
      error={error}
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Admins"
          description="Administrator accounts. Only a super admin can add, suspend or reinstate one."
        />

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Add an admin
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The account is active immediately. Set a password and hand it over
            in person — there is no email invitation.
          </p>
          <AddAdminForm onDone={adminsQuery.reload} />
        </Card>

        <DataTableView
          toolbar={
            <ListToolbar
              searchPlaceholder="Search admins"
              searchValue={list.searchInput}
              onSearchChange={list.setSearchInput}
              onFilterChange={list.setFilter}
              hasActiveFilters={list.hasActiveFilters}
              onClear={list.clear}
              filters={[
                {
                  id: "role",
                  label: "Role",
                  value: role,
                  options: [
                    { value: "", label: "All admins" },
                    { value: "admin", label: "Admins" },
                    { value: "super_admin", label: "Super admins" },
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
          loading={adminsQuery.loading && admins.length === 0}
          refreshing={adminsQuery.loading && admins.length > 0}
          empty={admins.length === 0}
          emptyTitle="No admins match"
          emptyDescription="Try a different search, or clear the filters."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <p className="font-medium">{admin.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {admin.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    <RoleChip role={admin.role} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={admin.status} />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {formatDay(admin.createdAt)}
                  </TableCell>
                  <TableCell className="w-px whitespace-nowrap text-end">
                    <UserRowActions
                      userId={admin.id}
                      name={admin.name}
                      role={admin.role}
                      status={admin.status}
                      // Nobody may change the super admin, including themselves.
                      canManage={
                        admin.role !== "super_admin" && admin.id !== me?.id
                      }
                      onDone={adminsQuery.reload}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableView>
      </div>
    </Guarded>
  );
}

function AddAdminForm({ onDone }: { onDone: () => void }) {
  return (
    <ActionForm
      className="mt-4 grid gap-3 sm:grid-cols-2"
      submitLabel="Create admin"
      action={async (form) => {
        await api.post("/admin/admins", {
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        });
        onDone();
        return null;
      }}
    >
      <div>
        <label className="label" htmlFor="admin-name">
          Full name
        </label>
        <Input id="admin-name" name="name" autoComplete="off" required />
      </div>
      <div>
        <label className="label" htmlFor="admin-email">
          Email
        </label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="off"
          required
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="admin-password">
          Password
        </label>
        <Input
          id="admin-password"
          name="password"
          type="text"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          placeholder="At least 12 characters"
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Shown as plain text so you can read it out. The new admin can change
          it from the reset flow.
        </p>
      </div>
    </ActionForm>
  );
}
