import { Router } from "express";
import { asyncHandler } from "@/middleware/async-handler";
import { auth, requireRole } from "@/middleware/auth";
import { ok } from "@/lib/respond";
import {
  readSiteSettings,
  writeSiteSettings,
} from "@/controllers/site-settings";

/**
 * Public site identity, plus the super admin's write.
 *
 * The read is deliberately unauthenticated: the sign-in page shows the school
 * name and favicon before there is a session.
 */
export const siteRoutes = Router();

siteRoutes.get(
  "/site-settings",
  asyncHandler(async (_req, res) => ok(res, await readSiteSettings())),
);

siteRoutes.patch(
  "/admin/site-settings",
  auth(),
  requireRole("super_admin"),
  asyncHandler(async (req, res) => ok(res, await writeSiteSettings(req))),
);
