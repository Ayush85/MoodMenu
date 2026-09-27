import assert from "node:assert/strict";
import test from "node:test";

import { actorCan } from "../../shared/application/actor";
import { DomainError } from "../../shared/domain/errors";
import {
  can,
  type RestaurantAccess,
} from "./access";
import { resolveRestaurantAccess } from "../application/resolve-access";
import type { AccessRepository } from "../ports/access-repository";

const capabilities = [
  "manage_menu",
  "view_orders",
  "create_staff_order",
  "advance_order",
  "manage_waiter_calls",
  "manage_staff",
] as const;

test("restaurant capabilities distinguish owner, waiter, cook, and chef", () => {
  const accessByRole: Array<[RestaurantAccess, Record<string, boolean>]> = [
    [
      { kind: "OWNER" },
      Object.fromEntries(capabilities.map((capability) => [capability, true])),
    ],
    [
      { kind: "STAFF", role: "WAITER" },
      {
        manage_menu: false,
        view_orders: true,
        create_staff_order: true,
        advance_order: true,
        manage_waiter_calls: true,
        manage_staff: false,
      },
    ],
    [
      { kind: "STAFF", role: "COOK" },
      {
        manage_menu: false,
        view_orders: true,
        create_staff_order: false,
        advance_order: true,
        manage_waiter_calls: false,
        manage_staff: false,
      },
    ],
    [
      { kind: "STAFF", role: "CHEF" },
      {
        manage_menu: false,
        view_orders: true,
        create_staff_order: false,
        advance_order: true,
        manage_waiter_calls: false,
        manage_staff: false,
      },
    ],
  ];

  for (const [access, expected] of accessByRole) {
    for (const capability of capabilities) {
      assert.equal(
        can(access, capability),
        expected[capability],
        `${access.kind}${"role" in access ? `:${access.role}` : ""} ${capability}`,
      );
    }
  }

  assert.equal(actorCan({ id: "customer", type: "CUSTOMER" }, "view_orders"), false);
});

test("access resolution hides inactive and unrelated actors as not found", async () => {
  const repository: AccessRepository = {
    async findForActor() {
      return null;
    },
  };

  await assert.rejects(
    resolveRestaurantAccess(repository, "restaurant-1", {
      id: "staff-1",
      type: "STAFF",
    }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "NOT_FOUND");
      return true;
    },
  );
});

test("access resolution returns the repository policy without widening it", async () => {
  const repository: AccessRepository = {
    async findForActor(_restaurantId, actor) {
      return actor.type === "STAFF"
        ? { kind: "STAFF", role: "COOK" }
        : { kind: "OWNER" };
    },
  };

  assert.deepEqual(
    await resolveRestaurantAccess(repository, "restaurant-1", {
      id: "staff-1",
      type: "STAFF",
    }),
    { kind: "STAFF", role: "COOK" },
  );
});

