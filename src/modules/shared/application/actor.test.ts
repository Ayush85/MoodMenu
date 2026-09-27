import assert from "node:assert/strict";
import test from "node:test";

import {
  type ActorContext,
  type Capability,
  type StaffRole,
  actorCan,
} from "./actor";

test("actor contexts distinguish owner, staff, and customer actors", () => {
  const owner: ActorContext = {
    id: "owner-1",
    type: "OWNER",
    restaurantId: "restaurant-1",
  };
  const waiter: ActorContext = {
    id: "staff-1",
    type: "STAFF",
    role: "WAITER",
    restaurantId: "restaurant-1",
  };
  const customer: ActorContext = {
    id: "table-token-1",
    type: "CUSTOMER",
    restaurantId: "restaurant-1",
  };

  assert.equal(owner.type, "OWNER");
  assert.equal(waiter.role, "WAITER");
  assert.equal(customer.type, "CUSTOMER");
  assert.notEqual(owner.type, waiter.type);
  assert.notEqual(waiter.type, customer.type);
});

test("owner and role capabilities are represented without framework dependencies", () => {
  const capabilities: Capability[] = [
    "manage_menu",
    "view_orders",
    "create_staff_order",
    "advance_order",
    "manage_waiter_calls",
    "manage_staff",
  ];
  const owner: ActorContext = { id: "owner-1", type: "OWNER" };
  const waiter: ActorContext = {
    id: "staff-1",
    type: "STAFF",
    role: "WAITER",
  };
  const cook: ActorContext = {
    id: "staff-2",
    type: "STAFF",
    role: "COOK",
  };
  const customer: ActorContext = { id: "customer-1", type: "CUSTOMER" };

  assert.ok(capabilities.every((capability) => actorCan(owner, capability)));
  assert.equal(actorCan(waiter, "create_staff_order"), true);
  assert.equal(actorCan(waiter, "manage_menu"), false);
  assert.equal(actorCan(cook, "advance_order"), true);
  assert.equal(actorCan(cook, "create_staff_order"), false);
  assert.equal(actorCan(customer, "view_orders"), false);
});

test("staff roles stay constrained to the supported role vocabulary", () => {
  const roles: StaffRole[] = ["WAITER", "COOK", "CHEF"];

  assert.deepEqual(roles, ["WAITER", "COOK", "CHEF"]);
});

