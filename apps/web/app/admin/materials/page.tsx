"use client";

import { useState } from "react";
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
import { ActionForm } from "@/components/ui/action-form";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { Pagination } from "@/components/shared/pagination";
import { SearchSelect } from "@/components/ui/search-select";
import { api } from "@/lib/api-client";

type MaterialRow = {
  id: string;
  title: string;
  type: string;
  courseId: string;
  courseLabel: string;
  uploadedBy: string;
};

type CourseOption = { id: string; label: string };

export default function AdminMaterialsPage() {
  const materialsQuery = useAsync(
    () => api.get<MaterialRow[]>("/admin/materials"),
    [],
  );
  const coursesQuery = useAsync(
    () => api.get<CourseOption[]>("/admin/courses"),
    [],
  );
  const materials = materialsQuery.data ?? [];
  const courses = coursesQuery.data ?? [];
  // Controlled so the searchable course picker can carry the id into `FormData`.
  const [courseId, setCourseId] = useState("");

  // The API returns every material; search and paging happen here.
  const table = useTableControls(materials, {
    searchText: (material) =>
      `${material.title} ${material.courseLabel} ${material.type} ${material.uploadedBy}`,
    pageSize: 25,
  });

  return (
    <div>
      <PageHeader
        title="Materials"
        description="Add links to course notes, past papers and worksheets."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <ListToolbar
            searchPlaceholder="Search title, course or type"
            searchValue={table.searchInput}
            onSearchChange={table.setSearchInput}
            hasActiveFilters={table.hasActiveFilters}
            onClear={table.clear}
          />
          {materials.length === 0 ? (
            <Empty>No materials added yet.</Empty>
          ) : table.rows.length === 0 ? (
            <Empty>No material matches. Try a different search.</Empty>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Added by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.map((mat) => (
                    <TableRow key={mat.id}>
                      <TableCell className="font-medium">{mat.title}</TableCell>
                      <TableCell>{mat.courseLabel}</TableCell>
                      <TableCell className="capitalize">{mat.type.replace("_", " ")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {mat.uploadedBy}
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
          <h2 className="text-sm font-semibold text-foreground">Add material link</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a shareable file URL. The file itself must already be hosted.
          </p>
          {courses.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Create a course before adding its materials.
            </p>
          ) : (
            <ActionForm
              className="mt-4 space-y-4"
              submitLabel="Add material"
              action={async (form) => {
                await api.post("/admin/materials", {
                  courseId: form.get("courseId"),
                  title: form.get("title"),
                  type: form.get("type"),
                  fileUrl: form.get("fileUrl"),
                });
                materialsQuery.reload();
                return null;
              }}
            >
              <div>
                <label className="label" htmlFor="material-course">Course</label>
                <SearchSelect
                  id="material-course"
                  name="courseId"
                  options={courses.map((course) => ({
                    value: course.id,
                    label: course.label,
                  }))}
                  value={courseId}
                  onChange={setCourseId}
                  placeholder="Search courses"
                  emptyLabel="Choose a course"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="material-title">Title</label>
                <input
                  id="material-title"
                  name="title"
                  className="input"
                  placeholder="e.g. Chapter 1 revision notes"
                  maxLength={160}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="material-type">Material type</label>
                <select id="material-type" name="type" className="input" defaultValue="notes" required>
                  <option value="notes">Notes</option>
                  <option value="past_paper">Past paper</option>
                  <option value="worksheet">Worksheet</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="material-url">File URL</label>
                <input
                  id="material-url"
                  name="fileUrl"
                  type="url"
                  className="input"
                  placeholder="https://..."
                  autoComplete="url"
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Use a link students can open, such as a public Drive or storage URL.
                </p>
              </div>
            </ActionForm>
          )}
        </Card>
      </div>
    </div>
  );
}
