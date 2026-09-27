import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

async function source(relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), "utf8");
}

test("menu mutation routes delegate persistence to the Menu Management adapter", async () => {
  const routes = [
    "src/app/api/restaurants/[id]/categories/route.ts",
    "src/app/api/restaurants/[id]/items/route.ts",
    "src/app/api/restaurants/[id]/items/[itemId]/route.ts",
    "src/app/api/restaurants/[id]/import-csv/route.ts",
    "src/app/api/restaurants/[id]/import-from-photo/route.ts",
  ];

  for (const route of routes) {
    const code = await source(route);
    assert.doesNotMatch(code, /from ["']@\/lib\/db["']/u, route);
    assert.doesNotMatch(code, /\bprisma\./u, route);
  }
});

test("composition adapters obtain menu data through the published or management query", async () => {
  const dashboardRoute = await source("src/app/api/restaurants/[id]/route.ts");
  const publicPage = await source("src/app/menu/[slug]/page.tsx");

  assert.match(dashboardRoute, /getManagementMenu/u);
  assert.doesNotMatch(dashboardRoute, /categories:\s*\{/u);
  assert.match(publicPage, /getPublishedMenu/u);
  assert.doesNotMatch(publicPage, /categories:\s*\{/u);
});

test("menu route contracts retain the dashboard response keys", async () => {
  const categoryRoute = await source("src/app/api/restaurants/[id]/categories/route.ts");
  const importRoute = await source("src/app/api/restaurants/[id]/import-csv/route.ts");

  assert.match(categoryRoute, /status:\s*201/u);
  assert.match(categoryRoute, /success:\s*true/u);
  assert.match(importRoute, /itemsCreated/u);
  assert.match(importRoute, /categoriesCreated/u);
  assert.match(importRoute, /items:/u);
});

