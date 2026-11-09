"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAsync } from "@/lib/use-async";
import { useTableControls } from "@/lib/use-table-controls";
import { api } from "@/lib/api-client";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

import { PageHeader, Card, Empty } from "@/components/ui/nila";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { Pagination } from "@/components/shared/pagination";
import { InlineLoading } from "@/components/shared/skeleton";
import { CourseForm, CourseRow } from "./course-ui";
import { LevelForm, LevelRow } from "./level-ui";
import { SubjectForm, SubjectRow } from "./subject-ui";

type BoardLite = { id: string; name: string; slug: string; active: boolean };
type LevelLite = { id: string; name: string; order: number; active: boolean };
type SubjectLite = { id: string; name: string; slug: string; active: boolean };
type CourseRowData = {
  id: string;
  boardId: string;
  board: string;
  levelId: string;
  level: string;
  levelOrder: number;
  subjectId: string;
  subject: string;
  medium: string;
  active: boolean;
  books: number;
  label: string;
};
type CatalogLists = { boards: BoardLite[]; levels: LevelLite[]; subjects: SubjectLite[] };

const TABS = [
  { key: "courses", label: "Courses" },
  { key: "levels", label: "Levels" },
  { key: "subjects", label: "Subjects" },
] as const;

export default function CoursesPage() {
  // `useSearchParams` needs a Suspense boundary in a static export.
  return (
    <Suspense fallback={<InlineLoading />}>
      <CoursesContent />
    </Suspense>
  );
}

function CoursesContent() {
  const params = useSearchParams();
  const tab = params.get("tab") ?? "courses";
  const activeTab = TABS.some((t) => t.key === tab) ? tab : "courses";
  // Tabs are state, not links: a navigation would reload the static export.
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const currentTab = selectedTab ?? activeTab;

  const catalogQuery = useAsync(
    () => api.get<CatalogLists>("/admin/catalog"),
    [],
  );
  const coursesQuery = useAsync(
    () => api.get<CourseRowData[]>("/admin/courses"),
    [],
  );

  const { boards = [], levels = [], subjects = [] } = catalogQuery.data ?? {};
  const courses = coursesQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="Courses"
        description="A course is one board, one level and one subject, with an optional medium."
      >
        <Link href="/admin/books" className="border border-border bg-card text-foreground shadow-sm hover:bg-secondary">
          Recommended books
        </Link>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-border pb-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSelectedTab(item.key)}
            aria-pressed={currentTab === item.key}
            className={`tab ${currentTab === item.key ? "tab-active" : ""}`}
          >
            {item.label}
            <span className="ms-2 text-xs text-muted-foreground">
              {item.key === "courses"
                ? courses.length
                : item.key === "levels"
                  ? levels.length
                  : subjects.length}
            </span>
          </button>
        ))}
      </div>

      {currentTab === "courses" ? (
        <CoursesTab
          boards={boards}
          levels={levels}
          subjects={subjects}
          courses={courses}
        />
      ) : null}

      {currentTab === "levels" ? <LevelsTab levels={levels} /> : null}
      {currentTab === "subjects" ? <SubjectsTab subjects={subjects} /> : null}
    </>
  );
}

function CoursesTab({
  boards,
  levels,
  subjects,
  courses,
}: {
  boards: { id: string; name: string; active: boolean }[];
  levels: { id: string; name: string; active: boolean }[];
  subjects: { id: string; name: string; active: boolean }[];
  courses: CourseRowData[];
}) {
  const hasActiveOptions =
    boards.some((item) => item.active) &&
    levels.some((item) => item.active) &&
    subjects.some((item) => item.active);

  /*
   * Search, board/level filters and paging are client-side: the API returns
   * every course, and a filter click must be a re-render, not a navigation
   * (the Capacitor build cannot serve a new URL).
   */
  const table = useTableControls(
    [...courses].sort(
      (a, b) =>
        a.levelOrder - b.levelOrder || a.subject.localeCompare(b.subject),
    ),
    {
      searchText: (course) =>
        `${course.label} ${course.board} ${course.level} ${course.subject} ${course.medium}`,
      filterIds: ["boardId", "levelId"],
      filters: {
        boardId: (course, value) => course.boardId === value,
        levelId: (course, value) => course.levelId === value,
      },
      pageSize: 25,
    },
  );

  return (
    <div className="space-y-6">
      <ListToolbar
        searchPlaceholder="Search courses"
        searchValue={table.searchInput}
        onSearchChange={table.setSearchInput}
        onFilterChange={table.setFilter}
        hasActiveFilters={table.hasActiveFilters}
        onClear={table.clear}
        filters={[
          {
            id: "boardId",
            label: "Board",
            value: table.filters.boardId ?? "",
            options: [
              { value: "", label: "All boards" },
              ...boards.map((board) => ({
                value: board.id,
                label: board.name,
              })),
            ],
          },
          {
            id: "levelId",
            label: "Level",
            value: table.filters.levelId ?? "",
            options: [
              { value: "", label: "All levels" },
              ...levels.map((level) => ({
                value: level.id,
                label: level.name,
              })),
            ],
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {courses.length === 0 ? (
            <Empty>
              No courses yet. Create a board, a level and a subject first, then
              add the course.
            </Empty>
          ) : table.rows.length === 0 ? (
            <Empty>No course matches. Try a different search or filter.</Empty>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Board</TableHead>
                    <TableHead>Books</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.map((course) => (
                    <CourseRow key={course.id} course={course} />
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
          <h2 className="text-sm font-semibold text-foreground">New course</h2>
          {!hasActiveOptions ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Add or activate at least one board, one level and one subject before
              creating a course.
            </p>
          ) : (
            <CourseForm boards={boards} levels={levels} subjects={subjects} />
          )}
        </Card>
      </div>

      {courses.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {table.matched} course{table.matched === 1 ? "" : "s"} shown.{" "}
          <Link
            href={`/admin/courses/detail?id=${courses[0].id}`}
            className="text-primary"
          >
            Open the newest course
          </Link>{" "}
          to attach materials and see its recommended books.
        </p>
      ) : null}
    </div>
  );
}

function LevelsTab({
  levels,
}: {
  levels: { id: string; name: string; order: number; active: boolean }[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        {levels.length === 0 ? (
          <Empty>No levels yet.</Empty>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((item) => (
                  <LevelRow key={item.id} level={item} />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
      <Card className="h-fit p-5">
        <h2 className="text-sm font-semibold text-foreground">New level</h2>
        <LevelForm />
      </Card>
    </div>
  );
}

function SubjectsTab({
  subjects,
}: {
  subjects: { id: string; name: string; slug: string; active: boolean }[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        {subjects.length === 0 ? (
          <Empty>No subjects yet.</Empty>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((item) => (
                  <SubjectRow key={item.id} subject={item} />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
      <Card className="h-fit p-5">
        <h2 className="text-sm font-semibold text-foreground">New subject</h2>
        <SubjectForm />
      </Card>
    </div>
  );
}
