import type { GateUser } from "@lms/shared";
import { forbidden, notFound } from "@/lib/http-error";
import {
  findActiveEnrollmentBetween,
  findEnrollmentById,
} from "@/db/queries/enrollment";
import {
  isGuardianOf,
  listStudentIdsForParent,
} from "@/db/queries/guardianships";
import type { Tx } from "@/db";

/**
 * Record-level guards. Ported from `lib/auth/guards.ts`: the role gate in the
 * route proves *who* the caller is; these prove *which records* they may touch.
 */

/** An active enrollment ties this teacher to this student. */
export async function assertTeacherOf(
  teacherId: string,
  studentId: string,
): Promise<void> {
  const enrollment = await findActiveEnrollmentBetween(teacherId, studentId);
  if (!enrollment) {
    throw forbidden("This student is not in one of your classes.");
  }
}

/** A guardianships row ties this parent to this student. */
export async function assertParentOf(
  parentId: string,
  studentId: string,
): Promise<void> {
  if (!(await isGuardianOf(parentId, studentId))) {
    throw forbidden("This student is not linked to your account.");
  }
}

/** A single enrollment is visible to its student, teacher, linked parent, or an admin. */
export async function assertEnrollmentAccess(
  actor: GateUser,
  enrollmentId: string,
  conn: Tx | undefined = undefined,
) {
  const enrollment = await findEnrollmentById(enrollmentId, conn);
  if (!enrollment) throw notFound("Enrollment not found");

  if (actor.role === "super_admin" || actor.role === "admin") return enrollment;
  if (enrollment.studentId === actor.id || enrollment.teacherId === actor.id) {
    return enrollment;
  }
  if (
    actor.role === "parent" &&
    (await isGuardianOf(actor.id, enrollment.studentId))
  ) {
    return enrollment;
  }
  throw forbidden("You do not have access to this enrollment.");
}

/** A student reads only their own records; nobody passes another student's id. */
export function assertSelf(actor: GateUser, studentId: string): void {
  if (actor.role !== "student" || actor.id !== studentId) {
    throw forbidden("You can only view your own records.");
  }
}

/**
 * Invoices and similar read by student, parent or admin. The shape is the old
 * `getStudentInvoices` rule, unchanged.
 */
export async function assertCanReadStudent(
  actor: GateUser,
  studentId: string,
): Promise<void> {
  if (actor.role === "admin" || actor.role === "super_admin") return;
  if (actor.role === "student" && actor.id === studentId) return;
  if (actor.role === "parent" && (await isGuardianOf(actor.id, studentId)))
    return;
  throw forbidden(
    actor.role === "parent"
      ? "This student is not linked to your account."
      : "You do not have access to this student's records.",
  );
}

/** The parent's linked children, as ids. */
export function childIdsOf(parentId: string) {
  return listStudentIdsForParent(parentId);
}
