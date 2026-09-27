import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { DomainError } from "../../shared/domain/errors";
import {
  CustomerTableActorService,
  type CustomerTableActorRepository,
} from "./customer-table-actor";

const record = {
  restaurant: { id: "restaurant-1", ownerId: "owner-1", allowedIp: null },
  table: { id: "table-1", number: 1, label: "Table 1", qrVersion: 0 },
};

const repository: CustomerTableActorRepository = {
  async findBySlugAndTable() {
    return record;
  },
};

test("customer actor rejects missing, expired, and cross-table tokens", async () => {
  const service = new CustomerTableActorService(repository, () => false);

  await assert.rejects(
    service.resolve({ slug: "cafe", tableNumber: 1, tableToken: "expired" }),
    (error: unknown) => error instanceof DomainError && error.code === "VALIDATION_FAILED",
  );
  await assert.rejects(
    service.resolve({ slug: "cafe", tableNumber: 1, tableToken: "cross-table" }),
    (error: unknown) => error instanceof DomainError && error.code === "VALIDATION_FAILED",
  );
});

test("valid token resolution creates a customer actor scoped to one table", async () => {
  const service = new CustomerTableActorService(repository, () => true);
  const actor = await service.resolve({ slug: "cafe", tableNumber: 1, tableToken: "valid" });

  assert.deepEqual(actor, {
    id: "table-1",
    type: "CUSTOMER",
    restaurantId: "restaurant-1",
    tableId: "table-1",
    tableNumber: 1,
    tableLabel: "Table 1",
    ownerId: "owner-1",
    allowedIp: null,
  });
});

test("public customer routes delegate token-scoped operations", async () => {
  const root = process.cwd();
  const routes = [
    "src/app/api/menu/[slug]/orders/route.ts",
    "src/app/api/menu/[slug]/orders/[orderId]/route.ts",
    "src/app/api/menu/[slug]/call-waiter/route.ts",
  ];

  for (const route of routes) {
    const code = await readFile(path.join(root, route), "utf8");
    assert.doesNotMatch(code, /from ["']@\/lib\/db["']/u, route);
    assert.doesNotMatch(code, /\bprisma\./u, route);
    assert.match(code, /createCustomerTableActorService/u, route);
  }
});

