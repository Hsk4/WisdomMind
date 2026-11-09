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
import type { SiteSettingsResponse } from "@lms/shared";
import { api } from "./api-client";
import { SCHOOL_NAME } from "./school";

/**
 * The school's identity, for every screen.
 *
 * `GET /site-settings` is public, so the sign-in page can show the name and
 * favicon before anyone has a token. The last answer is cached in
 * `localStorage` and used for the first paint, so a reload does not flash the
 * build-time name before the request lands.
 *
 * The provider also owns the two things a browser reads outside React: the
 * document title and the `<link rel="icon">`.
 */

const CACHE_KEY = "lms-site-settings";

export type SiteSettings = SiteSettingsResponse;

const FALLBACK: SiteSettings = {
  schoolName: SCHOOL_NAME,
  tagline: null,
  supportEmail: null,
  phone: null,
  address: null,
  favicon: null,
  updatedAt: new Date(0).toISOString(),
};

function readCache(): SiteSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SiteSettings>;
    return typeof parsed.schoolName === "string"
      ? { ...FALLBACK, ...parsed }
      : null;
  } catch {
    return null;
  }
}

function writeCache(settings: SiteSettings) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch {
    // A full quota only costs the first-paint cache.
  }
}

/** Point the tab icon at the school's favicon, or back at the default. */
function applyFavicon(favicon: string | null) {
  if (typeof document === "undefined") return;
  const existing = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!favicon) {
    if (existing?.dataset.school === "true") existing.remove();
    return;
  }
  const link = existing ?? document.createElement("link");
  link.rel = "icon";
  link.href = favicon;
  link.dataset.school = "true";
  if (!existing) document.head.appendChild(link);
}

type SiteSettingsState = {
  settings: SiteSettings;
  /** True once the API has answered at least once. */
  loaded: boolean;
  /** Re-read from the API (after a super admin saves). */
  refresh: () => Promise<void>;
  /** Apply a response the settings page already has, without a second read. */
  apply: (settings: SiteSettings) => void;
};

const SiteSettingsContext = createContext<SiteSettingsState | null>(null);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(
    () => readCache() ?? FALLBACK,
  );
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback((next: SiteSettings) => {
    setSettings(next);
    setLoaded(true);
    writeCache(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await api.get<SiteSettings>("/site-settings");
      apply(next);
    } catch {
      // The cached (or build-time) name stays; a failed read is not an error
      // the visitor can act on.
    }
  }, [apply]);

  /*
   * One read on mount. The state is set from the promise's callback, not from
   * the effect body, so the first paint is the cached name and the API answer
   * arrives as a normal update.
   */
  useEffect(() => {
    let cancelled = false;
    api
      .get<SiteSettings>("/site-settings")
      .then((next) => {
        if (!cancelled) apply(next);
      })
      .catch(() => {
        // The cached (or build-time) name stays.
      });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  // Title and icon follow the settings, on every route.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = settings.schoolName;
    applyFavicon(settings.favicon);
  }, [settings.schoolName, settings.favicon]);

  const value = useMemo<SiteSettingsState>(
    () => ({ settings, loaded, refresh, apply }),
    [settings, loaded, refresh, apply],
  );

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

/** The school's identity. Safe outside the provider: falls back to the build name. */
export function useSiteSettings(): SiteSettingsState {
  const context = useContext(SiteSettingsContext);
  if (context) return context;
  return {
    settings: FALLBACK,
    loaded: false,
    refresh: async () => {},
    apply: () => {},
  };
}

/** The school's name, for headings and copy. */
export function useSchoolName(): string {
  return useSiteSettings().settings.schoolName;
}
