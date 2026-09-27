import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../../domain/errors";
import { PrismaAuditLog } from "./PrismaAuditLog";

test("PrismaAuditLog persists safe audit metadata without secrets", async () => {
  let received: unknown;
  const log = new PrismaAuditLog({
    auditEvent: {
      async create(args) {
        received = args;
        return args;
      },
    },
  });

  await log.record({
    restaurantId: "restaurant-1",
    actorId: "owner-1",
    actorType: "OWNER",
    action: "menu.item.availability_changed",
    entityType: "MenuItem",
    entityId: "item-1",
    metadata: {
      isAvailable: false,
      tableToken: "must-not-persist",
      nested: { password: "must-not-persist" },
    },
    occurredAt: new Date("2026-09-27T12:00:00.000Z"),
  });

  assert.deepEqual(received, {
    data: {
      restaurantId: "restaurant-1",
      actorId: "owner-1",
      actorType: "OWNER",
      action: "menu.item.availability_changed",
      entityType: "MenuItem",
      entityId: "item-1",
      metadata: { isAvailable: false, nested: {} },
      occurredAt: new Date("2026-09-27T12:00:00.000Z"),
    },
  });
});

test("PrismaAuditLog surfaces controlled dependency failure", async () => {
  const log = new PrismaAuditLog({
    auditEvent: {
      async create() {
        throw new Error("database unavailable");
      },
    },
  });

  await assert.rejects(
    log.record({
      action: "order.created",
      entityType: "Order",
      occurredAt: new Date(),
    }),
    (error: unknown) => error instanceof DomainError && error.code === "DEPENDENCY_UNAVAILABLE",
  );
});
