import test from "node:test";
import assert from "node:assert/strict";
import { getActiveCategoryId } from "./category-navigation";

test("keeps the category at the sticky header active while scrolling forward and backward", () => {
  const sections = [
    { id: "breakfast", top: 120 },
    { id: "lunch", top: 760 },
    { id: "dinner", top: 1420 },
  ];

  assert.equal(getActiveCategoryId(sections, 80), "breakfast");
  assert.equal(getActiveCategoryId(sections, 900), "lunch");
  assert.equal(getActiveCategoryId(sections, 1550), "dinner");
  assert.equal(getActiveCategoryId(sections, 900), "lunch");
  assert.equal(getActiveCategoryId(sections, 80), "breakfast");
});

test("uses the first category before its heading reaches the activation point", () => {
  const sections = [
    { id: "breakfast", top: 400 },
    { id: "lunch", top: 900 },
  ];

  assert.equal(getActiveCategoryId(sections, 100), "breakfast");
});
