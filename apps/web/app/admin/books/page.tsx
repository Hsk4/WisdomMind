"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { BookForm } from "./book-ui";
import { InlineLoading } from "@/components/shared/skeleton";

type BookRow = {
  id: string;
  title: string;
  author: string;
  note: string;
  courseIds: string[];
  courses: string[];
};

type CourseRow = { id: string; label: string };

function BooksContent() {
  const params = useSearchParams();
  const courseId = params.get("courseId") ?? undefined;

  const booksQuery = useAsync(
    () => api.get<BookRow[]>("/admin/books"),
    [],
  );
  const coursesQuery = useAsync(
    () => api.get<CourseRow[]>("/admin/courses"),
    [],
  );

  const books = booksQuery.data ?? [];
  const courseOptions = (coursesQuery.data ?? []).map((course) => ({
    id: course.id,
    label: course.label,
  }));

  // The API returns every book; search and paging happen here.
  const table = useTableControls(books, {
    searchText: (book) =>
      `${book.title} ${book.author} ${book.courses.join(" ")}`,
    pageSize: 25,
  });

  return (
    <>
      <PageHeader
        title="Books"
        description="Recommended courseware. Students buy them themselves, so there is no price here."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <ListToolbar
            searchPlaceholder="Search title, author or course"
            searchValue={table.searchInput}
            onSearchChange={table.setSearchInput}
            hasActiveFilters={table.hasActiveFilters}
            onClear={table.clear}
          />
          {books.length === 0 ? (
            <Empty>No books yet.</Empty>
          ) : table.rows.length === 0 ? (
            <Empty>No book matches. Try a different search.</Empty>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell>
                        <Link
                          href={`/admin/books/detail?id=${book.id}`}
                          className="font-medium text-primary"
                        >
                          {book.title}
                        </Link>
                        {book.author ? (
                          <p className="text-xs text-muted-foreground">
                            {book.author}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        {book.courses.length === 0 ? (
                          <span className="text-muted-foreground">
                            No course
                          </span>
                        ) : (
                          <ul className="space-y-0.5">
                            {book.courses.map((label) => (
                              <li key={label}>{label}</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <Link
                          href={`/admin/books/detail?id=${book.id}`}
                          className="text-primary hover:bg-tint hover:text-tint-foreground h-8"
                        >
                          Open
                        </Link>
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
          <h2 className="text-sm font-semibold text-foreground">New book</h2>
          <BookForm courses={courseOptions} preselect={courseId} />
        </Card>
      </div>
    </>
  );
}

export default function BooksPage() {
  return (
    <Suspense
      fallback={<InlineLoading />}
    >
      <BooksContent />
    </Suspense>
  );
}