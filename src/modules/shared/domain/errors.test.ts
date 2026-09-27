import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "./errors";

test("DomainError preserves a safe code, message, and details", () => {
  const error = new DomainError("VALIDATION_FAILED", "Name is required", {
    field: "name",
  });

  assert.equal(error.name, "DomainError");
  assert.equal(error.code, "VALIDATION_FAILED");
  assert.equal(error.message, "Name is required");
  assert.deepEqual(error.details, { field: "name" });
  assert.ok(error instanceof Error);
});

