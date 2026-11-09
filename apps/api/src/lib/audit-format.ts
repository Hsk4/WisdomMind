import type { AuditChange } from "@lms/shared";

/**
 * Turns an audit row into a sentence a person can read.
 *
 * The table stores `action` plus free-form `before`/`after` snapshots. The web
 * used to print those snapshots as JSON, which is unreadable and leaks ids. The
 * wording lives here, on the server, so the page is a plain table and a new
 * action only needs one entry in `ACTION_LABELS`.
 */

/** What each action is called, in the past tense. */
export const ACTION_LABELS: Record<string, string> = {
  assignRole: "Changed role",
  rejectUser: "Rejected account",
  suspendUser: "Suspended account",
  reinstateUser: "Reinstated account",
  createParentLink: "Created link code",
  revokeParentLink: "Cancelled link code",
  redeemParentLink: "Used link code",
  testRedeemParentLink: "Tested link code",
  revokeParentInvite: "Cancelled link code",
  reissueParentInvite: "Reissued link code",
  linkGuardian: "Linked parent to student",
  unlinkGuardian: "Unlinked parent from student",
  setTeacherCourses: "Changed teacher courses",
  switchParentDevice: "Switched parent phone",
  resetParentDevice: "Unlocked parent phone",
  createAdmin: "Created admin",
  updateSiteSettings: "Changed school settings",
  decideRequest: "Decided access request",
};

/** The label for an action key, falling back to the key itself. */
export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** Every action key we know, for the filter dropdown. */
export function knownActions(): { key: string; label: string }[] {
  return Object.entries(ACTION_LABELS).map(([key, label]) => ({ key, label }));
}

/** Field names as a person would say them. */
const FIELD_LABELS: Record<string, string> = {
  role: "Role",
  status: "Status",
  reason: "Reason",
  rejectionReason: "Rejection reason",
  state: "State",
  code: "Code",
  expiresAt: "Expires",
  courseIds: "Courses",
  parentId: "Parent",
  studentId: "Student",
  deviceId: "Phone",
  deviceLabel: "Phone",
  schoolName: "School name",
  tagline: "Tagline",
  supportEmail: "Support email",
  phone: "Phone",
  address: "Address",
  favicon: "Favicon",
  email: "Email",
  name: "Name",
};

/** Fields that are ids or noise and must never be shown. */
const HIDDEN_FIELDS = new Set([
  "id",
  "userId",
  "actorId",
  "targetId",
  "acceptedBy",
  "decidedBy",
  "updatedBy",
  "testRedeemedBy",
  "createdAt",
  "updatedAt",
  "at",
]);

function isIdLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/** A value as short text: dates shortened, arrays counted, ids dropped. */
function display(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value))
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") {
    if (isIdLike(value)) return null;
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
    // A data URL is a favicon; say so instead of printing kilobytes.
    if (value.startsWith("data:")) return "Uploaded image";
    return value.length > 80 ? `${value.slice(0, 77)}…` : value;
  }
  return null;
}

/**
 * The changed fields, as `{ label, from, to }`.
 *
 * A field present in only one snapshot is still a change: `before` is missing
 * on creation, `after` on deletion.
 */
export function describeChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditChange[] {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const changes: AuditChange[] = [];
  for (const key of keys) {
    if (HIDDEN_FIELDS.has(key)) continue;
    const from = display(before?.[key]);
    const to = display(after?.[key]);
    if (from === to) continue;
    if (from === null && to === null) continue;
    changes.push({ label: FIELD_LABELS[key] ?? key, from, to });
  }
  return changes;
}

/** What the entry is about, as a name. Never an id. */
export function describeTarget(
  targetType: string,
  targetName: string | null,
): string {
  const type = targetType
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
  return targetName ? `${type}: ${targetName}` : type;
}
