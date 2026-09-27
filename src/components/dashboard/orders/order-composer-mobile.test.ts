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
