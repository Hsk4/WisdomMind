"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@lms/shared";
import { api, ApiError, errorMessage, setUnauthorizedHandler } from "./api-client";
import {
  clearSession,
  readStoredUser,
  readToken,
  writeSession,
  type StoredUser,
} from "./session";

/**
 * The one place the app knows who is signed in.
 *
 * There is exactly one `/me` request per page load, it happens only when a
 * token exists, and its result lives here as plain React state. No cache, no
 * refetch policy, no invalidation — the provider is the state.
 *
 * Access is decided by the API: `user.home` and `user.role` come from `/me`, and
 * nothing here invents a role from localStorage. The stored profile is only a
 * first-paint hint, replaced by the API's answer as soon as it lands.
 */

export type AuthState = {
  /** `false` until the browser has been checked for a token. */
  ready: boolean;
  signedIn: boolean;
  user: MeResponse | null;
  /** A `/me` request is in flight (after sign-in or a manual refresh). */
  loading: boolean;
  /**
   * The provider has finished deciding: either there is a user, or there is
   * definitely no usable session. Guards redirect only once this is `true`.
   */
  settled: boolean;
  /** `/me` failed for a reason other than "not signed in". */
  error: string | null;
  /** Re-read the profile from the API. */
  refresh: () => Promise<void>;
  /** Store the token from `/auth/*`, then load the profile. */
  completeSignIn: (token: string, user: StoredUser) => Promise<MeResponse>;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

/** The stored hint, in the shape `/me` returns, for the first paint. */
function hintToMe(hint: StoredUser): MeResponse | null {
  if (!hint?.id || !hint.role) return null;
  return {
    id: String(hint.id),
    name: hint.name ?? "",
    email: hint.email ?? "",
    role: hint.role as MeResponse["role"],
    status: (hint.status ?? "pending") as MeResponse["status"],
    onboarded: Boolean(hint.onboarded),
    rejectedAt: null,
    rejectionReason: null,
    home: "/",
    pendingRequests: 0,
  };
}

/**
 * The one place the app knows who is signed in.
 *
 * One piece of state: the token and the profile it belongs to. The token is
 * read from `localStorage` on the first client render, and the profile is
 * re-read from `/me` whenever the token changes. A profile for a different
 * token is simply not this session's, so signing out or switching account
 * never shows stale data.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  /*
   * The stored session is read lazily, on the first client render. During the
   * static export's prerender `localStorage` does not exist, so the server
   * snapshot is "no session" and the client switches to the real value after
   * hydration — the guards never see a wrong "signed out" on the first paint.
   */
  const [session, setSession] = useState<{
    token: string | null;
    me: MeResponse | null;
  }>(() => {
    const stored = readToken();
    return { token: stored, me: stored ? hintToMe(readStoredUser()) : null };
  });
  const [ready] = useState(() => typeof window !== "undefined");
  const [error, setError] = useState<string | null>(null);
  // Bumped to force a re-read without changing the token.
  const [refreshTick, setRefreshTick] = useState(0);

  const token = session.token;
  const signedIn = token !== null;
  const user = session.me;
  const loading = Boolean(signedIn && !user && !error);

  const refresh = useCallback(async () => {
    setRefreshTick((tick) => tick + 1);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setSession({ token: null, me: null });
    setError(null);
    router.replace("/sign-in");
  }, [router]);

  // A 401 from any request means the stored token is dead: sign out once, and
  // remember why so the sign-in page can explain it.
  useEffect(() => {
    setUnauthorizedHandler((reason) => {
      clearSession(reason);
      setSession({ token: null, me: null });
    });
    return () => setUnauthorizedHandler(null);
  }, []);



  /*
   * The single profile read. Runs on mount and whenever the token changes — and
   * never when there is no token, which is what used to fire a burst of 401s on
   * every page load.
   */
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    api
      .get<MeResponse>("/me")
      .then((me) => {
        if (cancelled) return;
        setSession({ token, me });
        setError(null);
        // Keep the name/email hint in storage in step with the API.
        writeSession(token, {
          id: me.id,
          name: me.name,
          email: me.email,
          role: me.role,
          status: me.status,
          onboarded: me.onboarded,
        });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        // A 401 already cleared the session above; report anything else.
        if (caught instanceof ApiError && caught.status === 401) return;
        setError(errorMessage(caught, "Your account could not be loaded"));
      });

    return () => {
      cancelled = true;
    };
  }, [token, refreshTick]);

  const completeSignIn = useCallback(
    async (nextToken: string, nextUser: StoredUser) => {
      writeSession(nextToken, nextUser);
      // Read the profile before navigating: `home` decides the destination and
      // the guards need it on the very next render.
      const me = await api.get<MeResponse>("/me");
      setSession({ token: nextToken, me });
      writeSession(nextToken, {
        id: me.id,
        name: me.name,
        email: me.email,
        role: me.role,
        status: me.status,
        onboarded: me.onboarded,
      });
      return me;
    },
    [],
  );

  const value = useMemo<AuthState>(
    () => ({
      // Only once the client has read the stored session, so a hard load never
      // looks signed out for a tick.
      ready,
      signedIn,
      user,
      loading,
      settled: ready && !loading && (!signedIn || user !== null),
      error,
      refresh,
      completeSignIn,
      signOut,
    }),
    [ready, signedIn, user, loading, error, refresh, completeSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** The stored hint, for places that render before `/me` settles. */
export function useStoredUser(): StoredUser {
  return readStoredUser();
}
