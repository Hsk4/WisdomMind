import { eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { parentDevices } from "@/db/schema";
import type { Id, ParentDevice } from "@/db/types";

/**
 * One phone per parent.
 *
 * The first sign-in from a native app binds the account to that device. A
 * different device is refused until the parent says why they are switching;
 * the office can also unlock the account. The binding is a row, so "is this
 * phone allowed" is one indexed lookup, not a rule spread over the sign-in
 * code.
 */

type DeviceRow = typeof parentDevices.$inferSelect;

export function toParentDevice(row: DeviceRow): ParentDevice {
  return {
    parentId: row.parentId,
    deviceId: row.deviceId,
    deviceLabel: row.deviceLabel,
    boundAt: row.boundAt,
    changeReason: row.changeReason,
    changedAt: row.changedAt,
  };
}

export async function findParentDevice(
  parentId: Id,
  conn: Tx | typeof db = db,
): Promise<ParentDevice | null> {
  const [row] = await conn
    .select()
    .from(parentDevices)
    .where(eq(parentDevices.parentId, parentId))
    .limit(1);
  return row ? toParentDevice(row) : null;
}

/** First binding. `onConflictDoNothing` keeps a racing second sign-in honest. */
export async function bindParentDevice(
  input: { parentId: Id; deviceId: string; deviceLabel: string | null },
  conn: Tx | typeof db = db,
): Promise<void> {
  await conn
    .insert(parentDevices)
    .values({
      parentId: input.parentId,
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      boundAt: new Date(),
    })
    .onConflictDoNothing();
}

/** Move the binding to a new phone, recording why. */
export async function moveParentDevice(
  input: {
    parentId: Id;
    deviceId: string;
    deviceLabel: string | null;
    changeReason: string;
  },
  conn: Tx | typeof db = db,
): Promise<void> {
  const now = new Date();
  await conn
    .update(parentDevices)
    .set({
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      changeReason: input.changeReason,
      changedAt: now,
      updatedAt: now,
    })
    .where(eq(parentDevices.parentId, input.parentId));
}

/** Office unlock: the next sign-in binds whatever phone it comes from. */
export async function clearParentDevice(
  parentId: Id,
  conn: Tx | typeof db = db,
): Promise<void> {
  await conn.delete(parentDevices).where(eq(parentDevices.parentId, parentId));
}
