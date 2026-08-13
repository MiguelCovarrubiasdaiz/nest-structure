-- Safe for tables that already contain rows: add the column nullable, backfill
-- existing rows with a non-null placeholder (an invalid bcrypt hash, so those
-- legacy users must reset their password), then enforce NOT NULL.
ALTER TABLE "users" ADD COLUMN "password_hash" varchar(255);--> statement-breakpoint
UPDATE "users" SET "password_hash" = '!' WHERE "password_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;