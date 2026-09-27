import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../../shared/domain/errors";
import { Order } from "./order";

const clock = { now: () => new Date("2026-09-27T12:00:00.000Z") };
const momo = { itemId: "item-1", itemName: "Momo", unitPrice: 180 };

test("Order.create calculates totals from immutable menu snapshots", () => {
  const order = Order.create({
    restaurantId: "restaurant-1",
    tableId: "table-1",
    sessionId: "session-1",
    lines: [{ snapshot: momo, quantity: 2 }],
    note: "Less spicy",
    createdAt: clock.now(),
  });

  assert.equal(order.status, "NEW");
  assert.equal(order.total, 360);
  assert.deepEqual(order.lines[0], {
    itemId: "item-1",
    itemName: "Momo",
    quantity: 2,
    unitPrice: 180,
    lineTotal: 360,
  });
});

test("Order.create rejects invalid quantities and empty lines", () => {
  assert.throws(
    () => Order.create({
      restaurantId: "restaurant-1",
      tableId: "table-1",
      sessionId: "session-1",
      lines: [{ snapshot: momo, quantity: 0 }],
      createdAt: clock.now(),
    }),
    (error: unknown) => error instanceof DomainError && error.code === "VALIDATION_FAILED",
  );
  assert.throws(() => Order.create({
    restaurantId: "restaurant-1",
    tableId: "table-1",
    sessionId: "session-1",
    lines: [],
    createdAt: clock.now(),
  }));
});

test("Order.advanceTo enforces lifecycle and role capability rules", () => {
  const order = Order.create({
    restaurantId: "restaurant-1",
    tableId: "table-1",
    sessionId: "session-1",
    lines: [{ snapshot: momo, quantity: 1 }],
    createdAt: clock.now(),
  });

  assert.throws(
    () => order.advanceTo("PREPARING", "WAITER", clock),
    (error: unknown) => error instanceof DomainError && error.code === "FORBIDDEN",
  );
  const preparing = order.advanceTo("PREPARING", "KITCHEN", clock);
  assert.equal(preparing.status, "PREPARING");
  assert.throws(() => preparing.advanceTo("PAID", "OWNER", clock));
  const served = preparing.advanceTo("SERVED", "KITCHEN", clock);
  const paid = served.advanceTo("PAID", "WAITER", clock);
  assert.equal(paid.status, "PAID");
});

