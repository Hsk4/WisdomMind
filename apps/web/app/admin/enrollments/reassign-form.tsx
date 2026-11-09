"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { SearchSelect } from "@/components/ui/search-select";

export function ReassignForm({
  enrollmentId,
  currentTeacherId,
  teachers,
  onDone,
}: {
  enrollmentId: string;
  currentTeacherId: string;
  teachers: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const [teacherId, setTeacherId] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setMessage(null);
        try {
          await api.post(`/admin/enrollments/${enrollmentId}/reassign`, {
            teacherId,
          });
          setMessage("Reassigned.");
          onDone?.();
        } catch (error) {
          setMessage(errorMessage(error, "Could not reassign"));
        } finally {
          setPending(false);
        }
      }}
    >
      <div>
        <label className="label" htmlFor={`teacher-${enrollmentId}`}>
          Move to
        </label>
        <SearchSelect
          id={`teacher-${enrollmentId}`}
          name={`teacher-${enrollmentId}`}
          className="w-56"
          options={teachers
            .filter((teacher) => teacher.id !== currentTeacherId)
            .map((teacher) => ({ value: teacher.id, label: teacher.name }))}
          value={teacherId}
          onChange={setTeacherId}
          placeholder="Search teachers"
          emptyLabel="Choose a teacher"
          required
        />
      </div>
      <button
        type="submit"
        className="border border-border bg-card text-foreground shadow-sm hover:bg-secondary"
        disabled={pending}
      >
        {pending ? "Moving..." : "Reassign"}
      </button>
      {message ? (
        <span className="text-sm text-muted-foreground">{message}</span>
      ) : null}
    </form>
  );
}
