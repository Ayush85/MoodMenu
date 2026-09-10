-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "landingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN "landingPage" JSONB;
