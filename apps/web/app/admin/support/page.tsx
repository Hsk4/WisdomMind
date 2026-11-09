"use client";

import { useAsync } from "@/lib/use-async";
import { useTableControls } from "@/lib/use-table-controls";
import {
  PageHeader,
  Card,
  Chip,
  Empty,
  formatDay,
  toneFor,
} from "@/components/ui/nila";
import {
  EscalateTicketButton,
  TicketReplyForm,
} from "@/components/support/support-forms";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api-client";

type TicketRow = {
  id: string;
  subject: string;
  state: string;
  assignedTo: string | null;
  createdAt: string;
  createdBy: { name: string };
  messages: { author: string; text: string }[];
};

export default function AdminSupportPage() {
  const ticketsQuery = useAsync(() => api.get<TicketRow[]>("/support/tickets"), []);
  const tickets = ticketsQuery.data ?? [];

  // The API returns the whole queue; search, state filter and paging happen here.
  const table = useTableControls(tickets, {
    searchText: (ticket) =>
      `${ticket.subject} ${ticket.createdBy?.name ?? ""} ${ticket.messages
        .map((message) => message.text)
        .join(" ")}`,
    filterIds: ["state"],
    filters: { state: (ticket, value) => ticket.state === value },
    pageSize: 20,
  });

  return (
    <div>
      <PageHeader
        title="Support tickets"
        description="Student and teacher support requests. Escalate to the super admin if needed."
      />

      <ListToolbar
        searchPlaceholder="Search subject, person or message"
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
              { value: "open", label: "Open" },
              { value: "escalated", label: "Escalated" },
              { value: "closed", label: "Closed" },
            ],
          },
        ]}
      />
      {tickets.length === 0 ? (
        <Empty>No open tickets.</Empty>
      ) : table.rows.length === 0 ? (
        <Empty>No ticket matches. Try a different search or filter.</Empty>
      ) : (
        <div className="space-y-4">
          {table.rows.map((ticket) => (
            <Card key={ticket.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{ticket.subject}</h2>
                  <p className="text-sm text-muted-foreground">
                    By {ticket.createdBy?.name ?? "Unknown"} /{" "}
                    {formatDay(ticket.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Chip tone={toneFor(ticket.state)}>{ticket.state}</Chip>
                  {ticket.state !== "escalated" ? (
                    <EscalateTicketButton ticketId={ticket.id} />
                  ) : (
                    <Chip tone="red">super admin</Chip>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {ticket.messages.map((message, index) => (
                  <p key={index} className="text-sm">
                    <span className="font-medium">{message.author}:</span>{" "}
                    {message.text}
                  </p>
                ))}
              </div>

              <TicketReplyForm ticketId={ticket.id} />
            </Card>
          ))}
        </div>
      )}
      <Pagination
        page={table.page}
        pageCount={table.pageCount}
        totalItems={table.matched}
        pageSize={20}
        onPageChange={table.setPage}
      />
    </div>
  );
}
