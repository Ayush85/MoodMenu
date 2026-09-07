-- AlterTable
ALTER TABLE "TableSession" ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "WaiterCall" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "handledBy" TEXT;

-- CreateIndex
CREATE INDEX "OrderTicket_tableId_createdAt_idx" ON "OrderTicket"("tableId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderTicket_sessionId_status_idx" ON "OrderTicket"("sessionId", "status");

-- CreateIndex
CREATE INDEX "OrderTicket_restaurantId_status_idx" ON "OrderTicket"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "TableSession_tableId_status_idx" ON "TableSession"("tableId", "status");

-- CreateIndex
CREATE INDEX "TableSession_restaurantId_status_idx" ON "TableSession"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "WaiterCall_restaurantId_status_idx" ON "WaiterCall"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "WaiterCall_tableId_status_createdAt_idx" ON "WaiterCall"("tableId", "status", "createdAt");
