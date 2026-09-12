-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('BUY_ONE_GET_ONE', 'PERCENTAGE', 'FIXED_AMOUNT', 'HAPPY_HOUR', 'CUSTOM');

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "OfferType" NOT NULL DEFAULT 'CUSTOM',
    "value" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "daysOfWeek" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "startTime" TEXT,
    "endTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_restaurantId_isActive_startsAt_endsAt_idx" ON "Offer"("restaurantId", "isActive", "startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
