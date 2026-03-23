-- Custom domain for restaurants
ALTER TABLE "Restaurant" ADD COLUMN "customDomain" TEXT;
CREATE UNIQUE INDEX "Restaurant_customDomain_key" ON "Restaurant"("customDomain");

-- Menu scan tracking
CREATE TABLE "MenuScan" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableNumber" INTEGER,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuScan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MenuScan_restaurantId_createdAt_idx" ON "MenuScan"("restaurantId", "createdAt");

ALTER TABLE "MenuScan" ADD CONSTRAINT "MenuScan_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
