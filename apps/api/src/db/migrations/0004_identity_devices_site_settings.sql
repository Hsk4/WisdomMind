/*
 * Identity is the local `users.id` now.
 *
 * `clerk_id` was the hosted-provider identity string. Tokens carry the user id
 * as `sub`, so the column has no reader left. Dropping it also signs everyone
 * out: a token minted before this migration names a `clerk_id`, which no longer
 * resolves to an account.
 */
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_clerk_id_unique";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "clerk_id";--> statement-breakpoint
/*
 * One phone per parent, and the super admin's single test use of a link code.
 */
CREATE TABLE "parent_devices" (
	"parent_id" uuid PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"device_label" text,
	"bound_at" timestamp with time zone DEFAULT now() NOT NULL,
	"change_reason" text,
	"changed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parent_devices" ADD CONSTRAINT "parent_devices_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parent_devices_device_idx" ON "parent_devices" USING btree ("device_id");--> statement-breakpoint
ALTER TABLE "parent_invites" ADD COLUMN "test_redeemed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "parent_invites" ADD COLUMN "test_redeemed_by" uuid;--> statement-breakpoint
ALTER TABLE "parent_invites" ADD CONSTRAINT "parent_invites_test_redeemed_by_users_id_fk" FOREIGN KEY ("test_redeemed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
/*
 * School identity. One row, seeded with the product's default name so a fresh
 * database already answers `GET /site-settings`.
 */
CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"school_name" text DEFAULT 'Wisdom Mind' NOT NULL,
	"tagline" text,
	"support_email" text,
	"phone" text,
	"address" text,
	"favicon" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "site_settings" ("id", "school_name") VALUES ('default', 'Wisdom Mind') ON CONFLICT ("id") DO NOTHING;
