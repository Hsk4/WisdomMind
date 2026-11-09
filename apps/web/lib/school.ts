/**
 * Single-school identity.
 *
 * The name is data now, not a build constant: a super admin sets it in
 * Settings → School, and `SiteSettingsProvider` (`lib/site-settings.tsx`)
 * exposes it through `useSchoolName()`. This value is only the fallback for
 * the first paint, for the static export's prerender, and for a server
 * component that cannot read the API — so a deployment can still seed it with
 * `NEXT_PUBLIC_SCHOOL_NAME`.
 */
export const SCHOOL_NAME =
  process.env.NEXT_PUBLIC_SCHOOL_NAME?.trim() || "Wisdom Mind";

/** Public product name — the platform, not the school. */
export const PRODUCT_NAME = "Fastly";
