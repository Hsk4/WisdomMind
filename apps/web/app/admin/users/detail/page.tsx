"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { AdminUserDetail } from "@lms/shared";
import { api, errorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/use-async";
import { UserDetailView } from "./user-detail-view";
import { InlineLoading } from "@/components/shared/skeleton";

type TeacherCourseRow = { id: string; label: string; teacherIds: string[] };

/**
 * Static export cannot prerender an unknown id, so the id is a query param:
 * `/admin/users/detail/?id=...`, read inside a Suspense boundary.
 */
function DetailById() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";

  const userQuery = useAsync(
    () => api.get<AdminUserDetail>(`/admin/users/${id}`),
    [id],
    { enabled: Boolean(id) },
  );
  const coursesQuery = useAsync(
    () => api.get<TeacherCourseRow[]>("/admin/catalog/teacher-courses"),
    [],
  );
  const { user: me } = useAuth();

  if (!id)
    return (
      <p className="p-6 text-sm text-muted-foreground">No user selected.</p>
    );
  if (userQuery.loading && !userQuery.data) return <InlineLoading />;
  if (userQuery.error) {
    return (
      <p className="p-6 text-sm text-status-red">
        {errorMessage(userQuery.error, "We could not load this account.")}
      </p>
    );
  }
  if (!userQuery.data) return null;

  const user = userQuery.data;
  const actorRole = me?.role ?? null;
  const canManage =
    actorRole === "super_admin"
      ? user.role !== "super_admin"
      : user.role !== "super_admin" && user.role !== "admin";

  const courses = (coursesQuery.data ?? []).map((course) => ({
    id: course.id,
    label: course.label,
    selected: course.teacherIds.includes(user.id),
  }));

  return (
    <UserDetailView
      user={user}
      canManage={canManage}
      courses={courses}
      onChanged={userQuery.reload}
    />
  );
}

export default function AdminUserDetailPage() {
  return (
    <Suspense fallback={<InlineLoading />}>
      <DetailById />
    </Suspense>
  );
}
