import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../../shared/domain/errors";
import { TableSession } from "./table-session";
import { WaiterCall } from "./waiter-call";

const clock = { now: () => new Date("2026-09-27T12:00:00.000Z") };

test("table sessions close only after every sibling order is terminal", () => {
  const session = TableSession.create({
    id: "session-1",
    restaurantId: "restaurant-1",
    tableId: "table-1",
    startedAt: clock.now(),
  });

  assert.equal(session.status, "ACTIVE");
  assert.equal(session.canClose(["PAID", "CANCELED"]), true);
  assert.equal(session.canClose(["PAID", "PREPARING"]), false);
  const closed = session.close(clock);
  assert.equal(closed.status, "CLOSED");
  assert.equal(closed.endedAt?.toISOString(), clock.now().toISOString());
});

test("waiter calls follow pending, acknowledged, resolved lifecycle", () => {
  const call = WaiterCall.create({
    id: "call-1",
    restaurantId: "restaurant-1",
    tableId: "table-1",
    message: "Water please",
    createdAt: clock.now(),
  });

  const acknowledged = call.advanceTo("ACKNOWLEDGED", clock, "staff-1");
  assert.equal(acknowledged.status, "ACKNOWLEDGED");
  assert.equal(acknowledged.handledBy, "staff-1");
  const resolved = acknowledged.advanceTo("RESOLVED", clock, "staff-1");
  assert.equal(resolved.status, "RESOLVED");
  assert.throws(
    () => resolved.advanceTo("ACKNOWLEDGED", clock, "staff-1"),
    (error: unknown) => error instanceof DomainError && error.code === "CONFLICT",
  );
});

