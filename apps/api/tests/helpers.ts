import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { UserRole, UserStatus } from "@lms/shared";
import type { TokenVerifier } from "@/middleware/auth";

/**
 * Integration-test helpers: reset the throwaway database, seed rows through the
 * schema (never through product code), and mint fake tokens.
 */

const TABLES = [
  "audit_logs",
  "ticket_messages",
  "support_tickets",
  "attendance_records",
  "attendance_sessions",
  "submissions",
  "assignments",
  "enrollments",
  "classes",
  "meetings",
  "invoices",
  "materials",
  "book_courses",
  "books",
  "courses",
  "levels",
  "subjects",
  "boards",
  "parent_devices",
  "parent_invites",
  "guardianships",
  "student_subjects",
  "access_request_subjects",
  "access_requests",
  "teacher_courses",
  "users",
];

export async function resetDb(): Promise<void> {
  await db.execute(sql.raw(`TRUNCATE TABLE ${TABLES.join(", ")} CASCADE`));
  // The rows are gone, so the next test's "student_1" is a new account.
  ids.clear();
}

/**
 * Tokens name an account id: the token's `sub` is the local `users.id`.
 *
 * Tests still call the seed key a `clerkId` because that is the name every
 * existing test uses, but it is only a label — `users.id` is a `uuid` column
 * with foreign keys pointing at it, so the label is mapped to a real UUID here.
 * `tokenFor("student_1")` therefore yields that account's UUID, never the
 * label, which is what makes `authHeader("student_1")` resolve to its row.
 */
const ids = new Map<string, string>();

export function accountId(label: string): string {
  const existing = ids.get(label);
  if (existing) return existing;
  const created = randomUUID();
  ids.set(label, created);
  return created;
}

export const tokenFor = (accountIdOrLabel: string) =>
  `test-token-${accountId(accountIdOrLabel)}`;

export const testVerifier: TokenVerifier = async (token) => {
  if (!token.startsWith("test-token-")) throw new Error("bad token");
  const userId = token.slice("test-token-".length);
  return { userId, metadata: {} };
};

type SeedUser = {
  clerkId: string;
  name?: string;
  email?: string;
  role?: UserRole | null;
  status?: UserStatus;
  onboarded?: boolean;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  boardId?: string | null;
  levelId?: string | null;
};

export async function seedUser(input: SeedUser) {
  // Re-seeding the same label in one test reuses its id, as `tokenFor` does.
  const id = accountId(input.clerkId);
  const [row] = await db
    .insert(users)
    .values({
      id,
      name: input.name ?? input.clerkId,
      email: input.email ?? `${input.clerkId}@example.com`,
      role: input.role ?? null,
      status: input.status ?? "active",
      onboarded: input.onboarded ?? true,
      rejectedAt: input.rejectedAt ?? null,
      rejectionReason: input.rejectionReason ?? null,
      boardId: input.boardId ?? null,
      levelId: input.levelId ?? null,
    })
    .returning();
  return row;
}

export const authHeader = (clerkId: string) => ({
  Authorization: `Bearer ${tokenFor(clerkId)}`,
});
