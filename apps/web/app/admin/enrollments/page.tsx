"use client";

import { useAsync } from "@/lib/use-async";
import { useTableControls } from "@/lib/use-table-controls";
import { PageHeader, Card, Empty } from "@/components/ui/nila";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api-client";
import { ReassignForm } from "./reassign-form";

type EnrollmentRow = {
  id: string;
  studentName: string;
  studentEmail: string;
  courseLabel: string;
  teacherId: string;
  teacherName: string;
  className: string | null;
  state: string;
  teachers: { id: string; name: string }[];
};

export default function AdminEnrollmentsPage() {
  const enrollmentsQuery = useAsync(
    () => api.get<EnrollmentRow[]>("/admin/enrollments"),
    [],
  );
  const items = enrollmentsQuery.data ?? [];

  // The API returns every open enrollment; search and paging happen here.
  const table = useTableControls(items, {
    searchText: (item) =>
      `${item.studentName} ${item.studentEmail} ${item.courseLabel} ${item.teacherName} ${item.className ?? ""}`,
    pageSize: 20,
  });

  return (
    <>
      <PageHeader
        title="Enrollments"
        description="Reassign a student to another teacher. The old enrollment is cancelled and the new one created in one transaction."
      />
      <ListToolbar
        searchPlaceholder="Search student, course or teacher"
        searchValue={table.searchInput}
        onSearchChange={table.setSearchInput}
        hasActiveFilters={table.hasActiveFilters}
        onClear={table.clear}
      />
      {items.length === 0 ? (
        <Empty>No open enrollments.</Empty>
      ) : table.rows.length === 0 ? (
        <Empty>No enrollment matches. Try a different search.</Empty>
      ) : (
        <div className="space-y-3">
          {table.rows.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.studentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.studentEmail}
                  </p>
                </div>
                <span className="chip border-border text-muted-foreground">
                  {item.state}
                </span>
              </div>
              <p className="mt-2 text-sm">{item.courseLabel}</p>
              <p className="text-sm text-muted-foreground">
                Teacher: {item.teacherName} / {item.className ?? "one-on-one"}
              </p>
              <div className="mt-3">
                <ReassignForm
                  enrollmentId={item.id}
                  currentTeacherId={item.teacherId}
                  teachers={item.teachers}
                />
              </div>
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
    </>
  );
}
