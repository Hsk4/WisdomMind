"use client";

import type { ApiEnvelope } from "@lms/shared";
import { readToken } from "./session";

/**
 * The typed fetch wrapper for the API.
 *
 * Attaches the local session token as `Authorization: Bearer`, unwraps the
 * `{ ok, data }` / `{ ok: false, error }` envelope, and throws `ApiError` on a
 * failure so TanStack Query treats it as an error. The base URL is the API's
 * `/api/v1`; set it once from `NEXT_PUBLIC_API_URL`.
 */

const DEV_API_URL = "http://localhost:4000/api/v1";

/**
 * `NEXT_PUBLIC_API_URL` is inlined at build time. A production bundle that
 * falls back to localhost is a build mistake, not a runtime condition — it
 * ships an app that can reach nothing — so it says so in the console once
 * instead of failing every request with an opaque `ERR_CONNECTION_REFUSED`.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || DEV_API_URL;

if (process.env.NODE_ENV === "production" && BASE_URL === DEV_API_URL) {
  console.error(
    "[api] NEXT_PUBLIC_API_URL is not set: this production build will call localhost. Rebuild with the hosted API URL.",
  );
}

/**
 * Session invalidation hook. The auth provider registers a callback so a 401
 * from anywhere (expired JWT, revoked session version, suspended account) can
 * clear the stale token and send the user to sign-in once — instead of leaving
 * every panel stuck on a generic error.
 *
 * The callback does no navigation itself; the provider clears the session and
 * the guards redirect on the next render.
 */
type UnauthorizedHandler = (reason: string) => void;

let onUnauthorized: UnauthorizedHandler | null = null;
let notifying = false;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

/**
 * `reason` is shown on the sign-in page. A 401 with no message is the ordinary
 * "your session ended"; the device rule and a password change say so.
 */
export function notifyUnauthorized(reason = "session_expired") {
  if (notifying) return;
  notifying = true;
  try {
    onUnauthorized?.(reason);
  } finally {
    // Released on the next tick so a burst of parallel 401s signs out once.
    setTimeout(() => {
      notifying = false;
    }, 0);
  }
}

export class ApiError extends Error {
  readonly status: number;
  /** A machine-readable reason from the API (`DEVICE_LOCKED`, ...). */
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Anything that looks like a database or runtime failure is replaced before it
 * reaches a screen. A Drizzle error reads "Failed query: select ... from ...",
 * which tells a parent nothing and tells an attacker plenty.
 */
const LEAKY =
  /failed query|select .* from|insert into|update .* set|violates|syntax error|ECONN|ETIMEDOUT|ENOTFOUND|duplicate key|relation "|column "/i;

const FRIENDLY: Record<number, string> = {
  0: "We could not reach the school server. Check your connection and try again.",
  400: "Some of the details were not valid. Check the form and try again.",
  401: "Your session has ended. Please sign in again.",
  403: "You do not have access to this.",
  404: "We could not find that. It may have been removed.",
  409: "That change conflicts with something else. Refresh and try again.",
  413: "That file is too large.",
  429: "Too many attempts. Wait a moment and try again.",
  500: "Something went wrong on our side. Please try again.",
  502: "The school server is not responding. Try again in a moment.",
  503: "The school server is not responding. Try again in a moment.",
};

/** A message safe to show a person, whatever the API or the network said. */
export function friendlyMessage(
  status: number,
  message?: string | null,
): string {
  const text = (message ?? "").trim();
  if (!text || LEAKY.test(text)) {
    return FRIENDLY[status] ?? "Something went wrong. Please try again.";
  }
  return text;
}

/**
 * A thrown value as a sentence a person can read.
 *
 * Every screen that catches an error should show this rather than
 * `error.message`: a `TypeError` from a failed fetch, a Drizzle error that
 * slipped through, or a stack-shaped string all become the same friendly line
 * chosen by status. `ApiError` already carries a safe message, so it passes
 * through unchanged.
 */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) {
    const status = (error as { status?: number }).status ?? 0;
    return friendlyMessage(status, error.message);
  }
  return fallback;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
};

function withQuery(path: string, query?: RequestOptions["query"]) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiFetch<T>(
  path: string,
  { method = "GET", body, query }: RequestOptions = {},
): Promise<T> {
  // Read at call time, so a request made right after sign-in never depends on
  // a stale closure from the signed-out render.
  const token = readToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${BASE_URL}${withQuery(path, query)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    /*
     * A `TypeError` here is a network or CORS failure, not an HTTP status: the
     * browser withholds the response entirely when the API does not allow this
     * origin. Tell the three cases apart — offline, cold start, blocked origin —
     * because "Failed to fetch" helps nobody on a phone.
     */
    const offline =
      typeof navigator !== "undefined" && navigator.onLine === false;
    throw new ApiError(
      0,
      offline
        ? "You are offline. Check your connection and try again."
        : `Cannot reach the school server at ${BASE_URL}. It may be waking up — try again in a moment.`,
    );
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.ok === false) {
    const raw = payload && payload.ok === false ? payload.error : null;
    const code = payload && payload.ok === false ? payload.code : undefined;
    // A 401 means the stored token is no longer usable. A 403 is a policy
    // answer (wrong role, pending) and must not sign the user out.
    if (response.status === 401) notifyUnauthorized();
    throw new ApiError(
      response.status,
      friendlyMessage(response.status, raw),
      code,
    );
  }

  return payload.data;
}

/** Shorthand for the query functions. */
export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) =>
    apiFetch<T>(path, { query }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "DELETE", body }),
};
