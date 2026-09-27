import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootArgIndex = process.argv.indexOf("--root");
const root = path.resolve(
  rootArgIndex >= 0 && process.argv[rootArgIndex + 1]
    ? process.argv[rootArgIndex + 1]
    : process.cwd(),
);

const forbiddenInCore = [
  /(?:^|["'])@\/lib\/db(?:["']|$)/u,
  /@prisma\//u,
  /\/generated\/prisma/u,
  /(?:^|["'])next\//u,
  /(?:^|["'])react(?:["']|$)/u,
];
const forbiddenInRoutes = [
  /(?:^|["'])@\/lib\/db(?:["']|$)/u,
  /@prisma\//u,
  /\/generated\/prisma/u,
  /\bprisma\s*\./u,
];

const coreDirectories = ["domain", "application"];
const migratedRouteDirectories = [
  "src/app/api/restaurants/[id]/categories",
  "src/app/api/restaurants/[id]/items",
  "src/app/api/restaurants/[id]/import-csv",
  "src/app/api/restaurants/[id]/import-from-photo",
  "src/app/api/restaurants/[id]/orders",
  "src/app/api/restaurants/[id]/sessions",
  "src/app/api/restaurants/[id]/waiter-calls",
  "src/app/api/menu/[slug]/orders",
  "src/app/api/menu/[slug]/call-waiter",
];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(entryPath);
    return /\.(?:ts|tsx|mjs)$/u.test(entry.name) ? [entryPath] : [];
  });
}

function checkFiles(files, patterns, label) {
  const violations = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        violations.push(`${path.relative(root, file)} matches ${pattern}`);
      }
    }
  }
  return violations.map((violation) => `${label}: ${violation}`);
}

const violations = [];
for (const moduleDirectory of walk(path.join(root, "src/modules"))) {
  const relative = path.relative(path.join(root, "src/modules"), moduleDirectory);
  const segments = relative.split(path.sep);
  if (segments.length >= 2 && coreDirectories.includes(segments[1])) {
    violations.push(...checkFiles([moduleDirectory], forbiddenInCore, "core boundary"));
  }
}

for (const routeDirectory of migratedRouteDirectories) {
  violations.push(
    ...checkFiles(
      walk(path.join(root, routeDirectory)),
      forbiddenInRoutes,
      "route boundary",
    ),
  );
}

if (violations.length > 0) {
  console.error("DDD boundary violations found:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("DDD boundary check passed");
}
