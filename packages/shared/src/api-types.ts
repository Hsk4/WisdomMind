import type { UserRole, UserStatus } from "./roles";

/**
 * Response payload types shared by the API and the web client.
 *
 * These describe what crosses the wire: dates are ISO-8601 strings (UTC), money
 * is whole PKR integers, ids are the Postgres uuids as strings.
 */

export type Id = string;

/** `GET /api/v1/me` */
export type MeResponse = {
  id: Id;
  email: string;
  name: string;
  role: UserRole | null;
  status: UserStatus;
  onboarded: boolean;
  rejectedAt: string | null;
  rejectionReason: string | null;
  /** Where the account may land, from `homeFor`. */
  home: string;
  /** Open access requests, for the admin nav badge. */
  pendingRequests: number;
};

export type CatalogOption = { id: Id; label: string };

export type RequestStatusResponse = {
  status: UserStatus;
  role: UserRole | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
  hasOpenRequest: boolean;
  requestedRole: string | null;
};

/** The phone a parent account is bound to. */
export type ParentDeviceInfo = {
  deviceId: string;
  deviceLabel: string | null;
  boundAt: string;
  changeReason: string | null;
  changedAt: string | null;
};

/** `GET /api/v1/site-settings` — the school's identity, public. */
export type SiteSettingsResponse = {
  schoolName: string;
  tagline: string | null;
  supportEmail: string | null;
  phone: string | null;
  address: string | null;
  /** Data URL (PNG/JPG/WebP/ICO, <= 150 KB) or null. */
  favicon: string | null;
  updatedAt: string;
};

/** One field that changed, already worded for a human. */
export type AuditChange = { label: string; from: string | null; to: string | null };

/** `GET /api/v1/admin/audit-logs` */
export type AuditLogEntry = {
  id: Id;
  at: string;
  /** Who did it, as a name. */
  actor: string;
  actorRole: UserRole | null;
  /** What they did, as a sentence. */
  action: string;
  /** The machine action key, for the filter dropdown. */
  actionKey: string;
  /** What it was about, as a name. */
  target: string;
  changes: AuditChange[];
};

export type AuditLogResponse = {
  total: number;
  page: number;
  pageCount: number;
  /** Every action key present, for the dropdown. */
  actions: { key: string; label: string }[];
  entries: AuditLogEntry[];
};

/** `GET /api/v1/admin/users/:id` */
export type AdminUserDetail = {
  id: Id;
  email: string;
  name: string;
  role: UserRole | null;
  status: UserStatus;
  onboarded: boolean;
  createdAt: string;
  boardId: Id | null;
  levelId: Id | null;
  boardName: string | null;
  levelName: string | null;
  /** Parents only. */
  device: ParentDeviceInfo | null;
  /** Students only. */
  guardians: { id: Id; name: string; email: string }[];
  /** Teachers only. */
  courseIds: Id[];
};
