import assert from "node:assert/strict";
import test from "node:test";
import { buildFoodImagePrompt } from "./image-prompts";

test("buildFoodImagePrompt anchors AI generation to the interpreted dish", () => {
  const prompt = buildFoodImagePrompt(
    "Jhol Momo",
    "Steamed dumplings served in a spicy tomato sesame broth",
    "Nepalese dumpling soup with tomato sesame chili broth",
  );

  assert.match(prompt, /Nepalese dumpling soup with tomato sesame chili broth/i);
  assert.match(prompt, /must depict exactly this dish/i);
  assert.match(prompt, /do not substitute/i);
});
