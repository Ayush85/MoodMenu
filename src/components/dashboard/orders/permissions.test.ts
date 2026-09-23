import assert from "node:assert/strict";
import { test } from "node:test";
import { getAllowedOrderStatuses, getNextSuggestedStatus } from "./permissions";

test("owner can choose every order status", () => {
  assert.deepEqual(
    getAllowedOrderStatuses("USER", undefined),
    ["NEW", "PREPARING", "SERVED", "PAID", "CANCELED"],
  );
});

test("waiters can only move orders through front-of-house statuses", () => {
  assert.deepEqual(getAllowedOrderStatuses("STAFF", "WAITER"), ["SERVED", "PAID", "CANCELED"]);
});

test("kitchen staff can prepare, serve, or cancel orders", () => {
  assert.deepEqual(getAllowedOrderStatuses("STAFF", "CHEF"), ["PREPARING", "SERVED", "CANCELED"]);
});

test("suggested status follows each role's existing workflow", () => {
  assert.equal(getNextSuggestedStatus("USER", undefined, "NEW"), "PREPARING");
  assert.equal(getNextSuggestedStatus("STAFF", "WAITER", "PREPARING"), "SERVED");
  assert.equal(getNextSuggestedStatus("STAFF", "COOK", "SERVED"), null);
});
