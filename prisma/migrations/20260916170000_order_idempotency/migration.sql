ALTER TABLE "OrderTicket" ADD COLUMN "customerRequestId" TEXT;

CREATE UNIQUE INDEX "OrderTicket_customerRequestId_key" ON "OrderTicket"("customerRequestId");
