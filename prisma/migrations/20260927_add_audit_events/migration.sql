CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "actorId" TEXT,
    "actorType" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEvent_restaurantId_occurredAt_idx" ON "AuditEvent"("restaurantId", "occurredAt");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
