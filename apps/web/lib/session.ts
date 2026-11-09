"use client";

/**
 * The local session: one bearer token plus the last profile the API returned.
 *
 * This module owns nothing about React. It reads and writes `localStorage` and
 * notifies subscribers, so the provider, the API client and the sign-out button
 * all agree on one source of truth without anyone polling the server.
 *
 * Nothing here is trusted for access. The stored user is only a hint for the
 * first paint; the API re-reads the real profile on every load.
 */

const TOKEN_KEY = "lms-auth-token";
const USER_KEY = "lms-auth-user";
/** Why the last session ended, read once by the sign-in page. */
const NOTICE_KEY = "lms-auth-notice";

/** Fired in this tab when the token is written or cleared. */
const SESSION_CHANGED = "lms-auth-changed";

export type StoredUser = {
  id?: number | string;
  name?: string;
  email?: string;
  role?: string | null;
  status?: string;
  onboarded?: boolean;
} | null;

const isBrowser = () => typeof window !== "undefined";

export function readToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_KEY) ?? null;
}

export function readStoredUser(): StoredUser {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function writeSession(token: string, user: StoredUser) {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGED));
}

/**
 * Drop the token and the cached profile. Safe to call when signed out.
 *
 * `reason` is kept for the sign-in page: a session that ended because the
 * account was opened on another phone should say so, not look like a crash.
 */
export function clearSession(reason?: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  if (reason) window.localStorage.setItem(NOTICE_KEY, reason);
  // `storage` only fires in *other* tabs; this event covers this one.
  window.dispatchEvent(new Event(SESSION_CHANGED));
}

/** Read and forget the reason the last session ended. */
export function takeSessionNotice(): string | null {
  if (!isBrowser()) return null;
  const reason = window.localStorage.getItem(NOTICE_KEY);
  if (reason) window.localStorage.removeItem(NOTICE_KEY);
  return reason;
}

/** Re-render subscribers when the session is written or cleared, in any tab. */
export function subscribeToSession(onChange: () => void) {
  window.addEventListener(SESSION_CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SESSION_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}
