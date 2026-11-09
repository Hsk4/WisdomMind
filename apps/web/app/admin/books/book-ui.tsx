"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

export type CourseOption = { id: string; label: string };

function CoursePicker({
  courses,
  selected,
  idPrefix,
}: {
  courses: CourseOption[];
  selected: string[];
  idPrefix: string;
}) {
  const [checked, setChecked] = useState<string[]>(selected);
  const [query, setQuery] = useState("");

  // A school can have hundreds of courses; the box narrows the checkbox list.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? courses.filter((course) => course.label.toLowerCase().includes(needle))
      : courses;
  }, [courses, query]);

  return (
    <div>
      <p className="label">Courses</p>
      {courses.length > 0 ? (
        <div className="relative mb-2">
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
      ) : null}
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-[var(--radius-card)] border border-border p-2">
        {courses.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">
            No courses yet. Create one under Courses.
          </p>
        ) : visible.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No course matches.</p>
        ) : (
          visible.map((course) => (
            <label key={course.id} className="flex items-center gap-2 text-sm">
              <input
                id={`${idPrefix}-${course.id}`}
                type="checkbox"
                name="courseIds"
                value={course.id}
                checked={checked.includes(course.id)}
                onChange={(event) =>
                  setChecked((current) =>
                    event.target.checked
                      ? [...current, course.id]
                      : current.filter((value) => value !== course.id)
                  )
                }
              />
              <span>{course.label}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export function BookForm({
  courses,
  preselect,
  onDone,
}: {
  courses: CourseOption[];
  preselect?: string;
  onDone?: () => void;
}) {
  return (
    <ActionForm
      className="mt-4 space-y-4"
      submitLabel="Create book"
      action={async (form) => {
        await api.post("/admin/books", {
          title: form.get("title"),
          author: form.get("author") ?? "",
          courseIds: form.getAll("courseIds"),
          note: form.get("note") ?? "",
        });
        onDone?.();
        return null;
      }}
    >
      <div>
        <label className="label" htmlFor="book-title">
          Title
        </label>
        <input id="book-title" name="title" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="book-author">
          Author (optional)
        </label>
        <input id="book-author" name="author" className="input" />
      </div>
      <div>
        <CoursePicker
          courses={courses}
          selected={preselect ? [preselect] : []}
          idPrefix="new"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Select every course this book is recommended for.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="book-note">
          Note (optional)
        </label>
        <textarea id="book-note" name="note" className="textarea" />
      </div>
    </ActionForm>
  );
}

export function EditBookForm({
  book,
  courses,
  onDone,
}: {
  book: { id: string; title: string; author: string; note: string; courseIds: string[] };
  courses: CourseOption[];
  onDone?: () => void;
}) {
  return (
    <ActionForm
      className="space-y-3"
      submitLabel="Save book"
      resetOnSuccess={false}
      action={async (form) => {
        await api.patch(`/admin/books/${book.id}`, {
          title: form.get("title"),
          author: form.get("author") ?? "",
          courseIds: form.getAll("courseIds"),
          note: form.get("note") ?? "",
        });
        onDone?.();
        return null;
      }}
    >
      <div>
        <label className="label" htmlFor="edit-title">
          Title
        </label>
        <input id="edit-title" name="title" defaultValue={book.title} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="edit-author">
          Author
        </label>
        <input id="edit-author" name="author" defaultValue={book.author} className="input" />
      </div>
      <CoursePicker
        courses={courses}
        selected={book.courseIds}
        idPrefix={`edit-${book.id}`}
      />
      <div>
        <label className="label" htmlFor="edit-note">
          Note
        </label>
        <textarea id="edit-note" name="note" defaultValue={book.note} className="textarea" />
      </div>
    </ActionForm>
  );
}
