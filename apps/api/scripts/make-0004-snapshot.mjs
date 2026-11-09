#!/usr/bin/env node
/**
 * Hand-write `meta/0004_snapshot.json` from `meta/0003_snapshot.json`.
 *
 * `drizzle-kit generate` needs a live database to diff against, and the 0004
 * migration was written by hand (it drops `users.clerk_id`, which drizzle-kit
 * would otherwise ask about interactively). This script applies the same
 * changes to the previous snapshot so the next `db:generate` diffs from the
 * real state instead of re-proposing 0004.
 *
 * Usage: node scripts/make-0004-snapshot.mjs
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const meta = path.resolve(here, "../src/db/migrations/meta");
const previous = JSON.parse(
  readFileSync(path.join(meta, "0003_snapshot.json"), "utf8"),
);

const snapshot = structuredClone(previous);
snapshot.id = randomUUID();
snapshot.prevId = previous.id;

const column = (name, type, extra = {}) => ({
  name,
  type,
  primaryKey: false,
  notNull: false,
  ...extra,
});
const btree = (name, columns, isUnique = false) => ({
  name,
  columns: columns.map((expression) => ({
    expression,
    isExpression: false,
    asc: true,
    nulls: "last",
  })),
  isUnique,
  concurrently: false,
  method: "btree",
  with: {},
});
const foreignKey = (name, tableFrom, tableTo, columnsFrom, onDelete) => ({
  name,
  tableFrom,
  tableTo,
  columnsFrom,
  columnsTo: ["id"],
  onDelete,
  onUpdate: "no action",
});

/* users: clerk_id is gone, and so is its unique constraint. */
const users = snapshot.tables["public.users"];
delete users.columns.clerk_id;
delete users.uniqueConstraints.users_clerk_id_unique;

/* parent_invites: the super admin's one test use. */
const invites = snapshot.tables["public.parent_invites"];
invites.columns.test_redeemed_at = column(
  "test_redeemed_at",
  "timestamp with time zone",
);
invites.columns.test_redeemed_by = column("test_redeemed_by", "uuid");
invites.foreignKeys.parent_invites_test_redeemed_by_users_id_fk = foreignKey(
  "parent_invites_test_redeemed_by_users_id_fk",
  "parent_invites",
  "users",
  ["test_redeemed_by"],
  "set null",
);

/* parent_devices: one phone per parent. */
snapshot.tables["public.parent_devices"] = {
  name: "parent_devices",
  schema: "",
  columns: {
    parent_id: column("parent_id", "uuid", { primaryKey: true, notNull: true }),
    device_id: column("device_id", "text", { notNull: true }),
    device_label: column("device_label", "text"),
    bound_at: column("bound_at", "timestamp with time zone", {
      notNull: true,
      default: "now()",
    }),
    change_reason: column("change_reason", "text"),
    changed_at: column("changed_at", "timestamp with time zone"),
    updated_at: column("updated_at", "timestamp with time zone", {
      notNull: true,
      default: "now()",
    }),
  },
  indexes: {
    parent_devices_device_idx: btree("parent_devices_device_idx", [
      "device_id",
    ]),
  },
  foreignKeys: {
    parent_devices_parent_id_users_id_fk: foreignKey(
      "parent_devices_parent_id_users_id_fk",
      "parent_devices",
      "users",
      ["parent_id"],
      "cascade",
    ),
  },
  compositePrimaryKeys: {},
  uniqueConstraints: {},
  policies: {},
  checkConstraints: {},
  isRLSEnabled: false,
};

/* site_settings: one row, the school's identity. */
snapshot.tables["public.site_settings"] = {
  name: "site_settings",
  schema: "",
  columns: {
    id: column("id", "text", {
      primaryKey: true,
      notNull: true,
      default: "'default'",
    }),
    school_name: column("school_name", "text", {
      notNull: true,
      default: "'Wisdom Mind'",
    }),
    tagline: column("tagline", "text"),
    support_email: column("support_email", "text"),
    phone: column("phone", "text"),
    address: column("address", "text"),
    favicon: column("favicon", "text"),
    updated_by: column("updated_by", "uuid"),
    created_at: column("created_at", "timestamp with time zone", {
      notNull: true,
      default: "now()",
    }),
    updated_at: column("updated_at", "timestamp with time zone", {
      notNull: true,
      default: "now()",
    }),
  },
  indexes: {},
  foreignKeys: {
    site_settings_updated_by_users_id_fk: foreignKey(
      "site_settings_updated_by_users_id_fk",
      "site_settings",
      "users",
      ["updated_by"],
      "set null",
    ),
  },
  compositePrimaryKeys: {},
  uniqueConstraints: {},
  policies: {},
  checkConstraints: {},
  isRLSEnabled: false,
};

writeFileSync(
  path.join(meta, "0004_snapshot.json"),
  `${JSON.stringify(snapshot, null, 2)}\n`,
);
console.log("Wrote meta/0004_snapshot.json");
