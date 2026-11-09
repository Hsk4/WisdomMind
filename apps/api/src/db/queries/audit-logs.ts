import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { auditLogs, users } from "@/db/schema";
import type { AuditLog } from "@/db/types";

/**
 * Audit log reads. Postgres-backed.
 *
 * Writes live in `lib/audit.ts` because they must happen inside the caller's
 * transaction. This module is read-only by design: an audit trail that can be
 * edited is not an audit trail.
 */

type AuditRow = typeof auditLogs.$inferSelect;

function toAuditLog(row: AuditRow): AuditLog {
  return {
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    before: row.before ?? null,
    after: row.after ?? null,
    at: row.at,
  };
}

export async function listAuditLogs(
  limit = 200,
  conn: Tx | typeof db = db,
): Promise<AuditLog[]> {
  const rows = await conn
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.at))
    .limit(limit);
  return rows.map(toAuditLog);
}

/** One page of the log, with the actor's name joined in. */
export type AuditLogPageRow = AuditLog & {
  actorName: string;
  actorEmail: string;
  actorRole: string | null;
};

export type AuditLogFilter = {
  /** Matches the actor's name or email. */
  q?: string;
  action?: string;
};

function auditFilter(filter: AuditLogFilter): SQL[] {
  return [
    filter.action ? eq(auditLogs.action, filter.action) : undefined,
    filter.q
      ? or(
          ilike(users.name, `%${filter.q}%`),
          ilike(users.email, `%${filter.q}%`),
        )
      : undefined,
  ].filter((clause): clause is SQL => clause !== undefined);
}

export async function countAuditLogs(
  filter: AuditLogFilter = {},
  conn: Tx | typeof db = db,
): Promise<number> {
  const where = auditFilter(filter);
  const [row] = await conn
    .select({ value: count() })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(where.length ? and(...where) : undefined);
  return row?.value ?? 0;
}

export async function listAuditLogPage(
  filter: AuditLogFilter,
  page: number,
  pageSize: number,
  conn: Tx | typeof db = db,
): Promise<AuditLogPageRow[]> {
  const where = auditFilter(filter);
  const rows = await conn
    .select({
      log: auditLogs,
      actorName: users.name,
      actorEmail: users.email,
      actorRole: users.role,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(auditLogs.at))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return rows.map((row) => ({
    ...toAuditLog(row.log),
    actorName: row.actorName ?? "Deleted account",
    actorEmail: row.actorEmail ?? "",
    actorRole: row.actorRole ?? null,
  }));
}

/** Every action key that actually appears in the log, for the dropdown. */
export async function listAuditActions(
  conn: Tx | typeof db = db,
): Promise<string[]> {
  const rows = await conn
    .selectDistinct({ action: auditLogs.action })
    .from(auditLogs)
    .orderBy(auditLogs.action);
  return rows.map((row) => row.action);
}
