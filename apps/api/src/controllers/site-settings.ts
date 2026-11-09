import type { Request } from "express";
import { siteSettingsSchema, type SiteSettingsResponse } from "@lms/shared";
import { db } from "@/db";
import {
  getSiteSettings,
  updateSiteSettings,
} from "@/db/queries/site-settings";
import { writeAudit } from "@/lib/audit";
import { forbidden } from "@/lib/http-error";
import { actorOf } from "@/middleware/auth";
import type { SiteSettings } from "@/db/types";

/**
 * The school's identity, read by every client and written by the super admin.
 *
 * `GET` is public: the sign-in page needs the name and favicon before anyone
 * has a token. `PATCH` is super-admin only, and audited — a school name is
 * what every parent sees, so a change should be traceable.
 */

function toResponse(settings: SiteSettings): SiteSettingsResponse {
  return {
    schoolName: settings.schoolName,
    tagline: settings.tagline,
    supportEmail: settings.supportEmail,
    phone: settings.phone,
    address: settings.address,
    favicon: settings.favicon,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

/** `GET /api/v1/site-settings` */
export async function readSiteSettings(): Promise<SiteSettingsResponse> {
  return toResponse(await getSiteSettings());
}

/** `PATCH /api/v1/admin/site-settings` */
export async function writeSiteSettings(
  req: Request,
): Promise<SiteSettingsResponse> {
  const actor = actorOf(req);
  if (actor.role !== "super_admin") {
    throw forbidden("Only a super admin can change school settings");
  }
  const input = siteSettingsSchema.parse(req.body ?? {});

  const before = await getSiteSettings();
  const updated = await db.transaction(async (tx) => {
    const next = await updateSiteSettings(
      {
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
      },
      actor.id,
      tx,
    );
    await writeAudit(
      {
        actorId: actor.id,
        action: "updateSiteSettings",
        targetType: "SiteSettings",
        targetId: null,
        before: {
          schoolName: before.schoolName,
          tagline: before.tagline,
          supportEmail: before.supportEmail,
          phone: before.phone,
          address: before.address,
          // Never store the image itself in the audit row.
          favicon: before.favicon ? "set" : null,
        },
        after: {
          schoolName: next.schoolName,
          tagline: next.tagline,
          supportEmail: next.supportEmail,
          phone: next.phone,
          address: next.address,
          favicon: next.favicon ? "set" : null,
        },
      },
      { tx },
    );
    return next;
  });

  return toResponse(updated);
}
