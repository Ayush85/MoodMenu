import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { PushNotificationPort } from "../../shared/infrastructure/PushNotificationPort";

const root = process.cwd();

async function source(relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), "utf8");
}

test("staff order and table routes delegate persistence to application adapters", async () => {
  const routes = [
    "src/app/api/restaurants/[id]/orders/route.ts",
    "src/app/api/restaurants/[id]/orders/[orderId]/route.ts",
    "src/app/api/restaurants/[id]/sessions/route.ts",
    "src/app/api/restaurants/[id]/sessions/[sessionId]/route.ts",
    "src/app/api/restaurants/[id]/waiter-calls/route.ts",
  ];

  for (const route of routes) {
    const code = await source(route);
    assert.doesNotMatch(code, /from ["']@\/lib\/db["']/u, route);
    assert.doesNotMatch(code, /\bprisma\./u, route);
  }
});

test("staff routes name their application service factories", async () => {
  const orderRoute = await source("src/app/api/restaurants/[id]/orders/route.ts");
  const statusRoute = await source("src/app/api/restaurants/[id]/orders/[orderId]/route.ts");
  const waiterCallRoute = await source("src/app/api/restaurants/[id]/waiter-calls/route.ts");

  assert.match(orderRoute, /createPrismaOrderService/u);
  assert.match(statusRoute, /createPrismaOrderService/u);
  assert.match(waiterCallRoute, /PrismaWaiterCallRepository/u);
});

test("push delivery failures are contained by the notification port", async () => {
  const errors: unknown[] = [];
  const port = new PushNotificationPort(
    async () => {
      throw new Error("FCM unavailable");
    },
    (error) => errors.push(error),
  );

  await assert.doesNotReject(port.send({
    title: "Order ready",
    body: "Table 1",
    userIds: ["staff-1"],
  }));
  assert.equal(errors.length, 1);
});
