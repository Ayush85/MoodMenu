import test from "node:test";
import assert from "node:assert/strict";
import { recoverOrders } from "./order-recovery";
import { readJson } from "../../lib/read-json";

test("keeps tracking IDs on temporary failures and removes only confirmed missing orders", async () => {
  const result = await recoverOrders(["ok", "offline", "server", "missing", "denied"], async id => {
    if (id === "offline") throw new Error("offline");
    if (id === "server") return new Response("unavailable", { status: 503 });
    if (id === "missing") return new Response("", { status: 404 });
    if (id === "denied") return new Response("", { status: 403 });
    return Response.json({ id });
  });
  assert.deepEqual(result.retainedIds, ["ok", "offline", "server", "denied"]);
  assert.deepEqual(result.orders, [{ id: "ok" }]);
  assert.equal(result.failed, true);
});

test("failed mutations cannot report success", async () => {
  await assert.rejects(readJson(Response.json({ error: "Category already exists" }, { status: 409 })), /Category already exists/);
  assert.deepEqual(await readJson(Response.json({ id: "saved" })), { id: "saved" });
});
