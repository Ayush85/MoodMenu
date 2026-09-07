-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "brandTheme" JSONB;
ALTER TABLE "Restaurant" ADD COLUMN "cardStyle" TEXT NOT NULL DEFAULT 'list';

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
