"use client";

import { useAsync } from "@/lib/use-async";
import { api } from "@/lib/api-client";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  Chip,
  Empty,
  PageHeader,
  formatDay,
  toneFor,
} from "@/components/ui/nila";
type CourseRow = {
  enrollmentId: string;
  state: string;
  courseLabel: string;
  teacherName: string;
  className: string | null;
  schedule: string | null;
  medium: string | null;
  requestedAt: string;
  decidedAt: string | null;
};

export default function StudentCoursesPage() {
  const coursesQuery = useAsync(
    () => api.get<CourseRow[]>("/student/courses"),
    [],
  );
  const courses = coursesQuery.data ?? [];
  const active = courses.filter((item) => item.state === "active");
  const history = courses.filter((item) => item.state !== "active");

  return (
    <div>
      <PageHeader
        title="My courses"
        description="Courses you are enrolled in and their teachers."
      >
        {/*
         * `Button asChild` owns the height, padding and hover state. The old
         * bare class list left a 129x26 link beside a 44px primary button, so
         * the secondary action looked like plain text.
         */}
        <Button asChild variant="outline" size="xl">
          <Link href="/student/teachers">Browse teachers</Link>
        </Button>
      </PageHeader>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Active ({active.length})
      </h2>
      {active.length === 0 ? (
        <Empty>
          No active course yet.{" "}
          <Link
            href="/student/teachers"
            className="font-medium text-primary hover:underline"
          >
            Pick a teacher
          </Link>{" "}
          to start.
        </Empty>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {active.map((course) => (
            <Card key={course.enrollmentId} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {course.courseLabel}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Teacher: {course.teacherName}
                  </p>
                </div>
                <Chip tone="green">Active</Chip>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Class</dt>
                  <dd>{course.className ?? "One-on-one"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Schedule</dt>
                  <dd>{course.schedule || "To be set"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Medium</dt>
                  <dd>{course.medium || "English"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Started</dt>
                  <dd>{formatDay(course.decidedAt ?? course.requestedAt)}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      )}

      {history.length ? (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            History ({history.length})
          </h2>
          {/*
           * A stack of cards on a phone, the table from `sm`. Four columns do
           * not fit 390px: "English Literature" wrapped to three lines, the
           * teacher name was cut to "Ayesha", and the chip was sliced by the
           * next cell — a row you cannot read is worse than no table.
           */}
          <div className="space-y-2 sm:hidden">
            {history.map((course) => (
              <Card key={course.enrollmentId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {course.courseLabel}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {course.teacherName}
                    </p>
                  </div>
                  <Chip tone={toneFor(course.state)}>{course.state}</Chip>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Requested {formatDay(course.requestedAt)}
                </p>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((course) => (
                  <TableRow key={course.enrollmentId}>
                    <TableCell>{course.courseLabel}</TableCell>
                    <TableCell>{course.teacherName}</TableCell>
                    <TableCell>
                      <Chip tone={toneFor(course.state)}>{course.state}</Chip>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDay(course.requestedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : null}
    </div>
  );
}
