import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { scrollFocusedElementIntoView } from "./order-composer-mobile";

const composerSource = readFileSync(new URL("./OrderComposer.tsx", import.meta.url), "utf8");

test("order composer uses the full dynamic viewport on mobile", () => {
  assert.match(composerSource, /h-\[100dvh\]/);
  assert.match(composerSource, /max-h-none/);
  assert.match(composerSource, /sm:max-h-\[min\(92dvh,48rem\)\]/);
});

test("order composer keeps the focused search field visible after viewport changes", () => {
  assert.match(composerSource, /visualViewport/);
  assert.match(composerSource, /scrollFocusedElementIntoView/);
});

test("scrollFocusedElementIntoView centers only the active field", () => {
  let options: ScrollIntoViewOptions | undefined;
  const target = {
    scrollIntoView(nextOptions: ScrollIntoViewOptions) {
      options = nextOptions;
    },
  } as unknown as HTMLElement;

  assert.equal(scrollFocusedElementIntoView(target, target), true);
  assert.deepEqual(options, { block: "center", behavior: "auto" });
  assert.equal(scrollFocusedElementIntoView(target, null), false);
  assert.deepEqual(options, { block: "center", behavior: "auto" });
});

test("order composer makes table selection fast to scan and search", () => {
  assert.match(composerSource, /tableSearch/);
  assert.match(composerSource, /Search table number or name/);
  assert.match(composerSource, /filteredTables/);
  assert.match(composerSource, /Choose a table/);
});

test("order composer waits to focus item search until a table is selected", () => {
  assert.match(composerSource, /if \(!open \|\| !selectedTableId\) return;/);
  assert.match(composerSource, /\}, \[open, selectedTableId\]\);/);
});

test("order composer supports category-first item discovery and tap to add", () => {
  assert.match(composerSource, /selectedCategoryId/);
  assert.match(composerSource, /All items/);
  assert.match(composerSource, /Add \$\{item\.name\}/);
  assert.match(composerSource, /Tap to add/);
});

test("order composer keeps the selected table and cart visible in the footer", () => {
  assert.match(composerSource, /sticky bottom-0/);
  assert.match(composerSource, /selectedTable \?/);
  assert.match(composerSource, /itemCount/);
});

test("order composer shows selected item pricing details", () => {
  assert.match(composerSource, /Rs\. \$\{fmt\(item\.price\)\} each/);
  assert.match(composerSource, /Rs\. \$\{fmt\(quantity \* item\.price\)\}/);
  assert.match(composerSource, /Rs\. \$\{fmt\(row\.unitPrice\)\} each/);
});
