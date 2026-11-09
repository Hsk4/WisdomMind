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
import { PageHeader, Card, Empty } from "@/components/ui/nila";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api-client";

type InvoiceRow = {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  state: string;
  studentName?: string;
  studentEmail?: string;
};

export default function AdminInvoicesPage() {
  const invoicesQuery = useAsync(
    () => api.get<InvoiceRow[]>("/admin/invoices"),
    [],
  );
  const invoices = invoicesQuery.data ?? [];

  // The API returns every invoice; search, state filter and paging happen here.
  const table = useTableControls(invoices, {
    searchText: (invoice) =>
      `${invoice.studentName ?? ""} ${invoice.studentEmail ?? ""} ${invoice.period} ${invoice.state}`,
    filterIds: ["state"],
    filters: { state: (invoice, value) => invoice.state === value },
    pageSize: 25,
  });

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create invoices for tuition and mark them paid."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <ListToolbar
            searchPlaceholder="Search student or period"
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
                  { value: "unpaid", label: "Unpaid" },
                  { value: "paid", label: "Paid" },
                  { value: "void", label: "Void" },
                ],
              },
            ]}
          />
          {invoices.length === 0 ? (
            <Empty>No invoices yet.</Empty>
          ) : table.rows.length === 0 ? (
            <Empty>No invoice matches. Try a different search or filter.</Empty>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount (PKR)</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <p className="font-medium">
                          {invoice.studentName ?? "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.studentEmail ?? ""}
                        </p>
                      </TableCell>
                      <TableCell>{invoice.period}</TableCell>
                      <TableCell className="font-mono">
                        {Number(invoice.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`status-${
                            invoice.state === "paid"
                              ? "green"
                              : invoice.state === "void"
                                ? "amber"
                                : "red"
                          }`}
                        >
                          {invoice.state}
                        </span>
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
        </div>

        <Card className="h-fit p-5">
          <h3 className="text-sm font-semibold">Create invoice</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Form and additional actions coming soon.
          </p>
        </Card>
      </div>
    </div>
  );
}
