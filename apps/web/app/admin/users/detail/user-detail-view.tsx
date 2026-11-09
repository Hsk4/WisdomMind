"use client";

import Link from "next/link";
import type { AdminUserDetail } from "@lms/shared";
import {
  Card,
  PageHeader,
  RoleChip,
  StatusChip,
  formatDate,
} from "@/components/ui/nila";
import { UserActions } from "./user-actions";
import { TeacherCoursesForm } from "../teacher-courses";

export type { AdminUserDetail };

/**
 * One account, in full: who it is, what it is bound to, and what an admin may
 * do to it.
 *
 * The parent's phone is shown here because it is the one thing the office
 * cannot see anywhere else — and the one thing a parent calls about ("I
 * changed phones"). The unlock action lives in `UserActions`.
 */
export function UserDetailView({
  user,
  canManage,
  courses,
  onChanged,
}: {
  user: AdminUserDetail;
  canManage: boolean;
  /** Every course, with this teacher's selection, for the courses form. */
  courses: { id: string; label: string; selected: boolean }[];
  onChanged: () => void;
}) {
  return (
    <>
      <PageHeader title={user.name} description={user.email}>
        <Link
          href="/admin/users"
          className="border border-border bg-card text-foreground shadow-sm hover:bg-secondary"
        >
          Back to users
        </Link>
      </PageHeader>

      <Card className="p-5">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Role</dt>
            <dd className="mt-1">
              <RoleChip role={user.role} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <StatusChip status={user.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Onboarded</dt>
            <dd className="mt-1">{user.onboarded ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Joined</dt>
            <dd className="mt-1">{formatDate(user.createdAt)}</dd>
          </div>
          {user.role === "student" ? (
            <div>
              <dt className="text-muted-foreground">Board / level</dt>
              <dd className="mt-1">
                {[user.boardName, user.levelName].filter(Boolean).join(" / ") ||
                  "—"}
              </dd>
            </div>
          ) : null}
          {user.role === "student" ? (
            <div>
              <dt className="text-muted-foreground">Guardians</dt>
              <dd className="mt-1">
                {user.guardians.length === 0
                  ? "None linked"
                  : user.guardians.map((guardian) => guardian.name).join(", ")}
              </dd>
            </div>
          ) : null}
        </dl>
      </Card>

      {user.role === "parent" ? (
        <Card className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-foreground">Phone</h2>
          {user.device ? (
            <dl className="mt-3 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Device</dt>
                <dd className="mt-1">
                  {user.device.deviceLabel ?? "Unknown phone"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bound</dt>
                <dd className="mt-1">{formatDate(user.device.boundAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last change</dt>
                <dd className="mt-1">
                  {user.device.changedAt
                    ? formatDate(user.device.changedAt)
                    : "Never"}
                </dd>
              </div>
              {user.device.changeReason ? (
                <div className="sm:col-span-3">
                  <dt className="text-muted-foreground">Reason given</dt>
                  <dd className="mt-1">{user.device.changeReason}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Not bound to a phone yet. The first sign-in from the app binds it.
            </p>
          )}
        </Card>
      ) : null}

      {user.role === "teacher" ? (
        <Card className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Teachable courses
          </h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            A teacher only sees the classes of the courses ticked here.
          </p>
          <TeacherCoursesForm
            teacherId={user.id}
            courses={courses}
            onDone={onChanged}
          />
        </Card>
      ) : null}

      <div className="mt-6">
        {canManage ? (
          <UserActions
            userId={user.id}
            status={user.status}
            role={user.role}
            onDone={onChanged}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            This account is protected. Only a super admin may change admins, and
            nobody may change the super admin.
          </p>
        )}
      </div>
    </>
  );
}
