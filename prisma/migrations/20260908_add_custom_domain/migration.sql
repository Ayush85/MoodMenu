-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "customDomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_customDomain_key" ON "Restaurant"("customDomain");
