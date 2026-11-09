import { eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { siteSettings } from "@/db/schema";
import type { Id, SiteSettings } from "@/db/types";

/**
 * The school's identity. One row, `id = 'default'`.
 *
 * The migration seeds it, so a read never has to create anything; the write
 * upserts anyway so a database restored without the seed still works.
 */

export const SITE_SETTINGS_ID = "default";

/** The product's name until a super admin changes it. */
export const DEFAULT_SCHOOL_NAME = "Wisdom Mind";

type SettingsRow = typeof siteSettings.$inferSelect;

export function toSiteSettings(row: SettingsRow): SiteSettings {
  return {
    schoolName: row.schoolName,
    tagline: row.tagline,
    supportEmail: row.supportEmail,
    phone: row.phone,
    address: row.address,
    favicon: row.favicon,
    updatedAt: row.updatedAt,
  };
}

export async function getSiteSettings(
  conn: Tx | typeof db = db,
): Promise<SiteSettings> {
  const [row] = await conn
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, SITE_SETTINGS_ID))
    .limit(1);
  return row
    ? toSiteSettings(row)
    : {
        schoolName: DEFAULT_SCHOOL_NAME,
        tagline: null,
        supportEmail: null,
        phone: null,
        address: null,
        favicon: null,
        updatedAt: new Date(0),
      };
}

export async function updateSiteSettings(
  input: Partial<{
    schoolName: string;
    tagline: string | null;
    supportEmail: string | null;
    phone: string | null;
    address: string | null;
    favicon: string | null;
  }>,
  updatedBy: Id | null,
  conn: Tx | typeof db = db,
): Promise<SiteSettings> {
  const [row] = await conn
    .insert(siteSettings)
    .values({
      id: SITE_SETTINGS_ID,
      schoolName: input.schoolName ?? DEFAULT_SCHOOL_NAME,
      tagline: input.tagline ?? null,
      supportEmail: input.supportEmail ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      favicon: input.favicon ?? null,
      updatedBy,
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        ...(input.schoolName === undefined
          ? {}
          : { schoolName: input.schoolName }),
        ...(input.tagline === undefined ? {} : { tagline: input.tagline }),
        ...(input.supportEmail === undefined
          ? {}
          : { supportEmail: input.supportEmail }),
        ...(input.phone === undefined ? {} : { phone: input.phone }),
        ...(input.address === undefined ? {} : { address: input.address }),
        ...(input.favicon === undefined ? {} : { favicon: input.favicon }),
        updatedBy,
        updatedAt: new Date(),
      },
    })
    .returning();
  return toSiteSettings(row);
}
