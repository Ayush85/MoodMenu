import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const script = path.resolve("scripts/check-ddd-boundaries.mjs");

test("architecture gate rejects Prisma imports in a domain fixture", async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "menuor-ddd-"));
  try {
    await mkdir(path.join(fixture, "src/modules/fake/domain"), { recursive: true });
    await writeFile(
      path.join(fixture, "src/modules/fake/domain/bad.ts"),
      'import { prisma } from "@/lib/db";\n',
    );

    await assert.rejects(
      execFileAsync(process.execPath, [script, "--root", fixture]),
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("architecture gate passes the migrated repository", async () => {
  await execFileAsync(process.execPath, [script]);
});
