/**
 * The wire shape of every API response. Replaces the old server-action
 * `ActionState`: `{ ok: true, data }` or `{ ok: false, error }`.
 */
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: string;
  /** A machine-readable reason the client branches on (`DEVICE_LOCKED`). */
  code?: string;
};
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export const API_ERRORS = {
  unauthorized: "Please sign in again.",
  forbidden: "You do not have access to this page.",
  notFound: "Not found",
  validation: "Invalid input",
  internal: "Something went wrong",
} as const;
