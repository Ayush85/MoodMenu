import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../../shared/domain/errors";
import {
  assertBelongsToRestaurant,
  createMenuItemSnapshot,
  filterPublishedMenu,
  validateMenuName,
  validateMenuPrice,
  type MenuManagement,
  type MenuItem,
} from "./menu";

const item: MenuItem = {
  id: "item-1",
  restaurantId: "restaurant-1",
  categoryId: "category-1",
  name: "Momo",
  description: null,
  price: 180,
  image: null,
  tags: ["popular"],
  isAvailable: true,
  isSpecial: false,
  order: 0,
};

test("menu names are trimmed and cannot be empty", () => {
  assert.equal(validateMenuName("  Momo  "), "Momo");
  assert.throws(
    () => validateMenuName("   "),
    (error: unknown) => error instanceof DomainError && error.code === "VALIDATION_FAILED",
  );
  assert.throws(
    () => validateMenuName(null),
    (error: unknown) => error instanceof DomainError && error.code === "VALIDATION_FAILED",
  );
});

test("menu prices are finite and non-negative", () => {
  assert.equal(validateMenuPrice("180.50"), 180.5);
  assert.equal(validateMenuPrice(0), 0);
  assert.throws(() => validateMenuPrice(-1));
  assert.throws(() => validateMenuPrice(Number.NaN));
  assert.throws(() => validateMenuPrice(Number.POSITIVE_INFINITY));
});

test("restaurant ownership is checked before menu mutations", () => {
  assert.doesNotThrow(() => assertBelongsToRestaurant(item, "restaurant-1"));
  assert.throws(
    () => assertBelongsToRestaurant(item, "restaurant-2"),
    (error: unknown) => error instanceof DomainError && error.code === "NOT_FOUND",
  );
});

test("order snapshots retain the original name and price", () => {
  const snapshot = createMenuItemSnapshot(item);

  item.name = "Updated Momo";
  item.price = 220;

  assert.deepEqual(snapshot, {
    itemId: "item-1",
    itemName: "Momo",
    unitPrice: 180,
  });
});

test("published menus exclude unavailable items and empty categories", () => {
  const menu: MenuManagement = {
    categories: [
      {
        id: "category-1",
        restaurantId: "restaurant-1",
        name: "Momos",
        order: 0,
        items: [item, { ...item, id: "item-2", isAvailable: false }],
      },
      {
        id: "category-2",
        restaurantId: "restaurant-1",
        name: "Unavailable",
        order: 1,
        items: [{ ...item, id: "item-3", categoryId: "category-2", isAvailable: false }],
      },
    ],
  };

  assert.deepEqual(filterPublishedMenu(menu).categories.map((category) => category.id), [
    "category-1",
  ]);
  assert.deepEqual(filterPublishedMenu(menu).categories[0].items.map((entry) => entry.id), [
    "item-1",
  ]);
});

