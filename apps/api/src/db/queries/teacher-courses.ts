import { and, eq, inArray } from "drizzle-orm";
import { db, type Tx } from "@/db";
import {
  boards,
  courses,
  levels,
  subjects,
  teacherCourses,
  users,
} from "@/db/schema";
import type { Id } from "@/db/types";

/**
 * Teacher → course assignment. Postgres-backed.
 *
 * In Mongo this was `teacher.courseIds[]`: to find "who teaches this course" you
 * had to load every teacher and walk their arrays. `teacher_courses` has an index
 * on `course_id`, so the reverse question is a join.
 */

export async function listCourseIdsForTeacher(
  teacherId: Id,
  conn: Tx | typeof db = db,
): Promise<Id[]> {
  const rows = await conn
    .select({ courseId: teacherCourses.courseId })
    .from(teacherCourses)
    .where(eq(teacherCourses.teacherId, teacherId));
  return rows.map((row) => row.courseId);
}

/**
 * The course catalog with the active teachers on each course — the shape the
 * admin assignment screen needs. Built from the same two reads its parts use:
 * `teacher_courses` is indexed on `course_id`, so the reverse map is one
 * grouped read rather than a walk over every teacher.
 */
export async function getTeacherCourseAssignments(conn: Tx | typeof db = db) {
  const [courseRows, links, labels] = await Promise.all([
    conn
      .select({ id: courses.id, subjectId: courses.subjectId })
      .from(courses)
      .where(eq(courses.active, true)),
    listTeacherCourseLinks(conn),
    listCourseLabels({ active: true }, conn),
  ]);

  const labelById = new Map(labels.map((label) => [label.id, label.label]));
  const teacherIdsByCourse = new Map<Id, Id[]>();
  for (const [teacherId, courseIds] of links) {
    for (const courseId of courseIds) {
      const current = teacherIdsByCourse.get(courseId);
      if (current) current.push(teacherId);
      else teacherIdsByCourse.set(courseId, [teacherId]);
    }
  }

  return courseRows.map((row) => ({
    id: row.id,
    label: labelById.get(row.id) ?? "Course",
    // Lets the approval screen pre-tick the courses for the subjects an
    // applicant said they teach, without a second round trip.
    subjectId: row.subjectId,
    teacherIds: teacherIdsByCourse.get(row.id) ?? [],
  }));
}

/** teacherId → courseIds, for the admin assignment table. */
export async function listTeacherCourseLinks(
  conn: Tx | typeof db = db,
): Promise<Map<Id, Id[]>> {
  const rows = await conn
    .select({
      teacherId: teacherCourses.teacherId,
      courseId: teacherCourses.courseId,
    })
    .from(teacherCourses);
  const map = new Map<Id, Id[]>();
  for (const row of rows) {
    const current = map.get(row.teacherId);
    if (current) current.push(row.courseId);
    else map.set(row.teacherId, [row.courseId]);
  }
  return map;
}

/** Active teachers who teach any of the given courses. */
export async function listTeachersForCourses(
  courseIds: Id[],
  conn: Tx | typeof db = db,
): Promise<{ id: Id; name: string; email: string; courseIds: Id[] }[]> {
  if (courseIds.length === 0) return [];

  const rows = await conn
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      courseId: teacherCourses.courseId,
    })
    .from(teacherCourses)
    .innerJoin(users, eq(users.id, teacherCourses.teacherId))
    .where(
      and(
        inArray(teacherCourses.courseId, courseIds),
        eq(users.role, "teacher"),
        eq(users.status, "active"),
      ),
    );

  const byTeacher = new Map<
    Id,
    { id: Id; name: string; email: string; courseIds: Id[] }
  >();
  for (const row of rows) {
    const entry = byTeacher.get(row.id);
    if (entry) entry.courseIds.push(row.courseId);
    else
      byTeacher.set(row.id, {
        id: row.id,
        name: row.name,
        email: row.email,
        courseIds: [row.courseId],
      });
  }
  return [...byTeacher.values()];
}

export async function assignTeacherToCourse(
  teacherId: Id,
  courseId: Id,
  conn: Tx | typeof db = db,
): Promise<void> {
  await conn
    .insert(teacherCourses)
    .values({ teacherId, courseId })
    .onConflictDoNothing();
}

export async function unassignTeacherFromCourse(
  teacherId: Id,
  courseId: Id,
  conn: Tx | typeof db = db,
): Promise<void> {
  await conn
    .delete(teacherCourses)
    .where(
      and(
        eq(teacherCourses.teacherId, teacherId),
        eq(teacherCourses.courseId, courseId),
      ),
    );
}

/** Replace a teacher's whole assignment set — the admin form submits the full list. */
export async function replaceTeacherCourses(
  teacherId: Id,
  courseIds: Id[],
  conn: Tx | typeof db = db,
): Promise<void> {
  await conn
    .delete(teacherCourses)
    .where(eq(teacherCourses.teacherId, teacherId));
  const unique = [...new Set(courseIds)];
  if (unique.length === 0) return;
  await conn
    .insert(teacherCourses)
    .values(unique.map((courseId) => ({ teacherId, courseId })));
}

export type CourseLabelRow = { id: Id; label: string };

/**
 * Course labels in one query. Every panel shows "Board / Level / Subject / Medium",
 * and each used to fetch the three catalog tables separately.
 */
export async function listCourseLabels(
  filter: { courseIds?: Id[]; active?: boolean } = {},
  conn: Tx | typeof db = db,
): Promise<CourseLabelRow[]> {
  const where = [
    filter.active === undefined ? undefined : eq(courses.active, filter.active),
    filter.courseIds ? inArray(courses.id, filter.courseIds) : undefined,
  ].filter(
    (clause): clause is NonNullable<typeof clause> => clause !== undefined,
  );

  const rows = await conn
    .select({
      id: courses.id,
      board: boards.name,
      level: levels.name,
      subject: subjects.name,
      medium: courses.medium,
    })
    .from(courses)
    .innerJoin(boards, eq(boards.id, courses.boardId))
    .innerJoin(levels, eq(levels.id, courses.levelId))
    .innerJoin(subjects, eq(subjects.id, courses.subjectId))
    .where(where.length ? and(...where) : undefined);

  return rows.map((row) => ({
    id: row.id,
    label: `${row.board} / ${row.level} / ${row.subject}${
      row.medium ? ` / ${row.medium}` : ""
    }`,
  }));
}
