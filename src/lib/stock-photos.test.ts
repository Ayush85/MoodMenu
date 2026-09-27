import assert from "node:assert/strict";
import test from "node:test";
import { rankRelevantStockPhotos } from "./stock-photos";

test("rankRelevantStockPhotos removes unrelated candidates and keeps the closest dish matches first", () => {
  const results = rankRelevantStockPhotos("chicken dumplings", [
    { url: "portrait.jpg", alt: "portrait of a woman outdoors" },
    { url: "noodles.jpg", alt: "bowl of noodles with vegetables" },
    { url: "dumplings.jpg", alt: "close up chicken dumplings on a plate" },
  ]);

  assert.deepEqual(results.map((photo) => photo.url), ["dumplings.jpg"]);
});

test("rankRelevantStockPhotos understands common Nepalese food aliases", () => {
  const results = rankRelevantStockPhotos("momo", [
    { url: "salad.jpg", alt: "fresh green salad in a bowl" },
    { url: "dumplings.jpg", alt: "steamed dumplings with dipping sauce" },
  ]);

  assert.deepEqual(results.map((photo) => photo.url), ["dumplings.jpg"]);
});

test("rankRelevantStockPhotos rejects a generic alias-only match for a multi-word dish", () => {
  const results = rankRelevantStockPhotos("chicken momo", [
    { url: "generic-dumplings.jpg", alt: "steamed dumplings with sauce" },
  ]);

  assert.deepEqual(results, []);
});
