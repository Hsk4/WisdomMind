"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

export type TeacherCourse = { id: string; label: string; selected: boolean };

export function TeacherCoursesForm({
  teacherId,
  courses,
  onDone,
}: {
  teacherId: string;
  courses: TeacherCourse[];
  onDone?: () => void;
}) {
  const [selected, setSelected] = useState(
    courses.filter((course) => course.selected).map((course) => course.id),
  );
  const [query, setQuery] = useState("");

  // A teacher can hold dozens of courses; the box narrows the checkbox list.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? courses.filter((course) => course.label.toLowerCase().includes(needle))
      : courses;
  }, [courses, query]);

  return (
    <ActionForm
      className="space-y-3"
      submitLabel="Save courses"
      resetOnSuccess={false}
      action={async () => {
        await api.patch(`/admin/users/${teacherId}/courses`, {
          courseIds: selected,
        });
        onDone?.();
        return null;
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search courses"
          aria-label="Search courses"
          className="pl-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {selected.length} selected
        {query ? ` · ${visible.length} match` : ""}
      </p>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No course matches.</p>
        ) : null}
        {visible.map((course) => (
          <label key={course.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(course.id)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, course.id]
                    : current.filter((id) => id !== course.id),
                )
              }
            />
            {course.label}
          </label>
        ))}
      </div>
    </ActionForm>
  );
}
