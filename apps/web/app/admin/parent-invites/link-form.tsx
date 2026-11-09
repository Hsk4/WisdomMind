"use client";

import { useState, useTransition } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { SearchSelect } from "@/components/ui/search-select";

type Option = { id: string; label: string };

/** Admin repair: link a parent account to a student, or remove the link. */
export function LinkGuardianForm({
  parents,
  students,
  onDone,
}: {
  parents: Option[];
  students: Option[];
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Controlled, so the searchable selects can carry the value into `FormData`.
  const [parentId, setParentId] = useState("");
  const [studentId, setStudentId] = useState("");

  function run(action: "link" | "unlink", form: HTMLFormElement) {
    const data = new FormData(form);
    const payload = {
      parentId: String(data.get("parentId") ?? ""),
      studentId: String(data.get("studentId") ?? ""),
    };
    if (!payload.parentId || !payload.studentId) {
      setError("Choose both a parent and a student");
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        if (action === "link") await api.post("/admin/guardians", payload);
        else await api.delete("/admin/guardians", payload);
        setMessage(action === "link" ? "Linked." : "Link removed.");
        onDone?.();
      } catch (submissionError) {
        setError(errorMessage(submissionError, "Could not save the link"));
      }
    });
  }

  if (parents.length === 0 || students.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        Need at least one active parent and one active student.
      </p>
    );
  }

  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        run("link", event.currentTarget);
      }}
    >
      <div>
        <label className="label" htmlFor="link-parent">
          Parent
        </label>
        <SearchSelect
          id="link-parent"
          name="parentId"
          options={parents.map((parent) => ({
            value: parent.id,
            label: parent.label,
          }))}
          value={parentId}
          onChange={setParentId}
          placeholder="Search parents"
          emptyLabel="Choose a parent"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="link-student">
          Student
        </label>
        <SearchSelect
          id="link-student"
          name="studentId"
          options={students.map((student) => ({
            value: student.id,
            label: student.label,
          }))}
          value={studentId}
          onChange={setStudentId}
          placeholder="Search students"
          emptyLabel="Choose a student"
          required
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending}
        >
          {pending ? "Saving..." : "Link"}
        </button>
        <button
          type="button"
          className="border border-border bg-card text-status-red shadow-sm hover:bg-status-red-soft"
          disabled={pending}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) run("unlink", form);
          }}
        >
          Remove link
        </button>
      </div>
      {message ? <p className="text-sm text-status-green">{message}</p> : null}
      {error ? <p className="text-sm text-status-red">{error}</p> : null}
    </form>
  );
}
