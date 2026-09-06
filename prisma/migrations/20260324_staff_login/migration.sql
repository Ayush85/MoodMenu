-- AlterTable
ALTER TABLE "RestaurantStaff" ADD COLUMN "email" TEXT;
ALTER TABLE "RestaurantStaff" ADD COLUMN "password" TEXT;

-- Backfill unique placeholder emails for existing rows if any
UPDATE "RestaurantStaff"
SET "email" = CONCAT('staff-', "id", '@local.menuor')
WHERE "email" IS NULL;

-- Enforce required email and uniqueness
ALTER TABLE "RestaurantStaff" ALTER COLUMN "email" SET NOT NULL;
CREATE UNIQUE INDEX "RestaurantStaff_email_key" ON "RestaurantStaff"("email");
