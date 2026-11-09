"use client";

import { useAsync } from "@/lib/use-async";
import { useTableControls } from "@/lib/use-table-controls";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { PageHeader, Card, Empty, formatDay } from "@/components/ui/nila";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api-client";
import { InviteActions } from "./invite-actions";
import { LinkGuardianForm } from "./link-form";

type InviteRow = {
  id: string;
  parentName: string;
  parentEmail: string;
  studentName: string;
  studentEmail: string;
  code: string;
  state: string;
  createdAt: string;
  acceptedAt: string | null;
  /** When the office spent its one test use of the code, if it has. */
  testRedeemedAt: string | null;
};

type Options = {
  parents: { id: string; label: string }[];
  students: { id: string; label: string }[];
};

export default function AdminParentInvitesPage() {
  const invitesQuery = useAsync(
    () => api.get<InviteRow[]>("/admin/parent-links"),
    [],
  );
  const optionsQuery = useAsync(
    () => api.get<Options>("/admin/parent-links/options"),
    [],
  );

  const invites = invitesQuery.data ?? [];
  const options = optionsQuery.data ?? { parents: [], students: [] };

  // The API returns every code; search, state filter and paging happen here.
  const table = useTableControls(invites, {
    searchText: (invite) =>
      `${invite.parentName} ${invite.parentEmail} ${invite.studentName} ${invite.studentEmail} ${invite.code}`,
    filterIds: ["state"],
    filters: { state: (invite, value) => invite.state === value },
    pageSize: 25,
  });

  return (
    <>
      <PageHeader
        title="Guardian link codes"
        description="Codes issued by students, and the parent accounts linked through them."
      />

      <Card className="mb-6 p-5">
        <h2 className="text-sm font-semibold">Repair a guardian link</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Use this when a parent accepted an invitation but the student does not
          appear in their panel. The link is written on both sides and
          audit-logged.
        </p>
        <div className="max-w-md">
          <LinkGuardianForm
            parents={options.parents}
            students={options.students}
            onDone={invitesQuery.reload}
          />
        </div>
      </Card>

      <ListToolbar
        searchPlaceholder="Search parent, student or code"
        searchValue={table.searchInput}
        onSearchChange={table.setSearchInput}
        onFilterChange={table.setFilter}
        hasActiveFilters={table.hasActiveFilters}
        onClear={table.clear}
        filters={[
          {
            id: "state",
            label: "State",
            value: table.filters.state ?? "",
            options: [
              { value: "", label: "Any state" },
              { value: "sent", label: "Sent" },
              { value: "accepted", label: "Accepted" },
              { value: "revoked", label: "Revoked" },
              { value: "expired", label: "Expired" },
            ],
          },
        ]}
      />

      {invites.length === 0 ? (
        <Empty>No link codes yet.</Empty>
      ) : table.rows.length === 0 ? (
        <Empty>No code matches. Try a different search or filter.</Empty>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="hidden md:table-cell">Accepted</TableHead>
                <TableHead>Test use</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>
                    <p className="font-medium">{invite.parentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {invite.parentEmail}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{invite.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {invite.studentEmail}
                    </p>
                  </TableCell>
                  <TableCell className="font-mono text-xs tracking-wider">
                    {invite.code}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        invite.state === "sent"
                          ? "bg-status-amber-soft text-status-amber"
                          : invite.state === "accepted"
                            ? "bg-status-green-soft text-status-green"
                            : invite.state === "revoked"
                              ? "bg-border text-muted-foreground"
                              : "bg-status-red-soft text-status-red"
                      }`}
                    >
                      {invite.state}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDay(invite.createdAt)}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {invite.acceptedAt ? formatDay(invite.acceptedAt) : "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {invite.testRedeemedAt ? (
                      <span className="text-muted-foreground">
                        Used {formatDay(invite.testRedeemedAt)}
                      </span>
                    ) : (
                      <span className="text-status-green">Available</span>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    {invite.state === "sent" && (
                      <InviteActions
                    inviteId={invite.id}
                    onDone={invitesQuery.reload}
                  />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <Pagination
        page={table.page}
        pageCount={table.pageCount}
        totalItems={table.matched}
        pageSize={25}
        onPageChange={table.setPage}
      />
    </>
  );
}
