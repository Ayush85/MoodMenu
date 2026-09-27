# Menu-first Modular Monolith DDD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce production-oriented DDD boundaries for Identity and Access, Menu Management, Ordering, and Table Service while preserving the existing Menuor API contracts and user workflows.

**Architecture:** Use a modular monolith under `src/modules/`. Domain code contains pure rules, application services orchestrate ports, Prisma adapters own persistence, and Next.js routes remain thin HTTP adapters. Migrate one endpoint group at a time using the existing database schema first, adding only additive audit/CI infrastructure required for the migrated core.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Prisma/PostgreSQL, NextAuth, Zod, Node's built-in test runner through `tsx`, existing rate limiting, logger, Sentry, and push adapters.

**Spec:** `docs/superpowers/specs/2026-09-27-menu-first-ddd-design.md`

## Global Constraints

- Menu Management is the primary domain; Ordering and Table Service are the operational core.
- Domain code cannot import Next.js, Prisma, React, environment variables, or provider SDKs.
- “Existing user flows, API contracts, and historical order data” remain compatible.
- “Orders preserve item name and price snapshots even after the menu changes.”
- “Order creation and status changes do not fail because push notification delivery is unavailable.”
- Public customer ordering remains a separate table-token actor flow.
- No microservices, broker, or wholesale Prisma replacement.
- No unrelated UI redesign; preserve the existing order-composer UX work already in the worktree.
- Every task uses test-first development and ends with focused verification before the next task.

## Review Focus

- A menu item moved, renamed, repriced, or made unavailable must not mutate an existing order line; test snapshot creation in Task 5 and API behavior in Task 7.
- An actor from another restaurant must receive the existing tenant-hiding not-found behavior; test access policy in Task 2 and route adapters in Tasks 4 and 7.
- A waiter, cook, chef, owner, and public table-token customer must receive different capabilities without relying on UI hiding; test policies in Task 2 and order transitions in Task 5.
- A 500-row menu import must validate before writing and remain atomic on persistence failure; test the application service and repository transaction in Task 4.
- A retried or duplicated order request must not create duplicate customer orders, and push failure must not roll back a committed order; test the ordering application service and integration adapter in Task 7.

---

### Task 1: Establish shared DDD contracts and module conventions

**Files:**
- Create: `src/modules/shared/domain/errors.ts`
- Create: `src/modules/shared/domain/result.ts`
- Create: `src/modules/shared/application/actor.ts`
- Create: `src/modules/shared/application/ports.ts`
- Create: `src/modules/shared/domain/errors.test.ts`
- Create: `src/modules/shared/application/actor.test.ts`
- Modify: `package.json` (add `test:domain` and include it in `test`)

**Interfaces:**
- `DomainError` with `code`, safe `message`, and optional `details`.
- `DomainErrorCode = "UNAUTHENTICATED" | "NOT_FOUND" | "FORBIDDEN" | "VALIDATION_FAILED" | "CONFLICT" | "RATE_LIMITED" | "DEPENDENCY_UNAVAILABLE"`.
- `ActorContext = { id: string; type: "OWNER" | "STAFF" | "CUSTOMER"; restaurantId?: string; role?: StaffRole }`.
- `Capability = "manage_menu" | "view_orders" | "create_staff_order" | "advance_order" | "manage_waiter_calls" | "manage_staff"`.
- `Clock` with `now(): Date` and `AuditLogPort` with `record(event): Promise<void>`.
- `test:domain` runs all `src/modules/**/*.test.ts` files with `node --import tsx --test`.

- [ ] **Step 1: Write failing contract tests**

  Test that `DomainError` preserves its code/details, actor contexts distinguish owner/staff/customer, and the `test:domain` glob can load module tests.

- [ ] **Step 2: Run the focused tests and verify red**

  Run `npm run test:domain`.

  Expected: FAIL because the shared module files and script do not exist.

- [ ] **Step 3: Implement the shared contracts**

  Keep these types framework-free. `StaffRole` may be defined in the shared module and re-exported by the existing order client types during migration so current UI imports remain valid.

- [ ] **Step 4: Run focused tests and project checks**

  Run `npm run test:domain`, `npm run typecheck`, and `npm run lint`.

  Expected: all new tests pass, TypeScript exits 0, and lint has no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add package.json src/modules/shared
  git commit -m "refactor: add shared domain contracts"
  ```

### Task 2: Centralize restaurant access and capability policies

**Files:**
- Create: `src/modules/identity-access/domain/access.ts`
- Create: `src/modules/identity-access/domain/access.test.ts`
- Create: `src/modules/identity-access/ports/access-repository.ts`
- Create: `src/modules/identity-access/application/resolve-access.ts`
- Create: `src/modules/identity-access/infrastructure/prisma/PrismaAccessRepository.ts`
- Modify: `src/lib/restaurant-access.ts`
- Modify: `src/app/api/restaurants/[id]/orders/route.ts`
- Modify: `src/app/api/restaurants/[id]/waiter-calls/route.ts`
- Modify: `src/app/api/restaurants/[id]/sessions/route.ts`
- Modify: `src/app/api/restaurants/[id]/tables/route.ts`

**Interfaces:**
- `RestaurantAccess = { kind: "OWNER" } | { kind: "STAFF"; role: StaffRole }`.
- `AccessRepository.findForActor(restaurantId: string, actor: { id: string; type: "OWNER" | "STAFF" }): Promise<RestaurantAccess | null>`.
- `resolveRestaurantAccess(repository, restaurantId, actor): Promise<RestaurantAccess>` throws `NOT_FOUND` when access is absent.
- `can(access: RestaurantAccess, capability: Capability): boolean`.
- `getRestaurantAccess` in `src/lib/restaurant-access.ts` remains a compatibility wrapper delegating to the module adapter.

- [ ] **Step 1: Write failing policy tests**

  Pin owner, waiter, cook, chef, and unknown access behavior for every capability. Pin that an inactive/missing actor resolves to a not-found error and never to a capability-bearing access object.

- [ ] **Step 2: Run `npm run test:domain` and verify red**

  Expected: FAIL because the module policy and use case do not exist.

- [ ] **Step 3: Implement the pure policy and Prisma adapter**

  Reuse the existing owner/staff query semantics, including active staff checks. The infrastructure adapter may import Prisma; domain/application files may not.

- [ ] **Step 4: Migrate duplicated route access checks**

  Remove route-local `getRestaurantAccess`, `canAccess`, and `verifyAccess` implementations from the listed order, waiter-call, session, and table routes. Preserve all current status/role restrictions and response codes.

- [ ] **Step 5: Run tests and static duplication checks**

  Run:

  ```bash
  npm run test:domain
  npm run test:orders
  rg -n "async function getRestaurantAccess|async function canAccess|async function verifyAccess" src/app/api/restaurants
  ```

  Expected: tests pass and no duplicate access helper remains in the migrated route groups.

- [ ] **Step 6: Commit**

  ```bash
  git add src/modules/identity-access src/lib/restaurant-access.ts src/app/api/restaurants
  git commit -m "refactor: centralize restaurant access policies"
  ```

### Task 3: Model Menu Management rules and application use cases

**Files:**
- Create: `src/modules/menu-management/domain/menu.ts`
- Create: `src/modules/menu-management/domain/menu.test.ts`
- Create: `src/modules/menu-management/ports/menu-repository.ts`
- Create: `src/modules/menu-management/ports/menu-catalog.ts`
- Create: `src/modules/menu-management/application/menu-service.ts`
- Create: `src/modules/menu-management/application/menu-service.test.ts`

**Interfaces:**
- `MenuCategory = { id: string; restaurantId: string; name: string; order: number }`.
- `MenuItem = { id: string; restaurantId: string; categoryId: string; name: string; description: string | null; price: number; image: string | null; tags: string[]; isAvailable: boolean; isSpecial: boolean; order: number }`.
- `MenuItemSnapshot = { itemId: string; itemName: string; unitPrice: number }`.
- `MenuRepository` methods for category/item CRUD, reordering, ownership validation, and atomic import.
- `MenuCatalog.getAvailableItemSnapshots(restaurantId, itemIds): Promise<MenuItemSnapshot[]>`.
- `MenuService` methods: `createCategory`, `renameCategory`, `reorderCategories`, `deleteCategory`, `createItem`, `updateItem`, `moveItem`, `reorderItems`, `setAvailability`, `deleteItem`, `importMenu`, `getManagementMenu`, and `getPublishedMenu`.

- [ ] **Step 1: Write failing domain tests**

  Test trimmed/non-empty names, finite non-negative prices, category/item restaurant ownership, target-category validation, unavailable-item exclusion, and immutable snapshots.

- [ ] **Step 2: Run `npm run test:domain` and verify red**

  Expected: FAIL because the Menu Management domain and service do not exist.

- [ ] **Step 3: Implement pure menu rules**

  Use plain TypeScript values and `DomainError`; do not import Prisma, Next.js, Zod, or UI types. The service must require a capability-bearing `ActorContext` for management commands and use `MenuCatalog` only for read/snapshot operations.

- [ ] **Step 4: Write application-service tests with in-memory repository fakes**

  Prove owner-only mutation behavior, public read behavior, import pre-validation, and that an invalid row prevents the repository write method from being called.

- [ ] **Step 5: Run tests and typecheck**

  Run `npm run test:domain` and `npm run typecheck`.

  Expected: all menu domain/application tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit**

  ```bash
  git add src/modules/menu-management
  git commit -m "feat: add menu management domain"
  ```

### Task 4: Add Prisma Menu adapters and migrate menu-management routes

**Files:**
- Create: `src/modules/menu-management/infrastructure/prisma/PrismaMenuRepository.ts`
- Create: `src/modules/menu-management/infrastructure/prisma/PrismaMenuCatalog.ts`
- Create: `src/modules/menu-management/infrastructure/prisma/menu-mappers.ts`
- Modify: `src/app/api/restaurants/[id]/categories/route.ts`
- Modify: `src/app/api/restaurants/[id]/items/route.ts`
- Modify: `src/app/api/restaurants/[id]/items/[itemId]/route.ts`
- Modify: `src/app/api/restaurants/[id]/import-csv/route.ts`
- Modify: `src/app/api/restaurants/[id]/import-from-photo/route.ts`
- Modify: `src/app/api/restaurants/[id]/route.ts` (compose the existing restaurant response with the Menu Management query)
- Modify: `src/app/menu/[slug]/page.tsx` (read categories/items through the published-menu query; retain non-menu mood/offer composition until Restaurant Management is migrated)

**Interfaces:**
- Prisma adapters map `Category`/`MenuItem` records to module types and are the only Menu Management files allowed to import `@/lib/db` or generated Prisma types. The two composition pages/routes may retain legacy Restaurant Management reads, but must not query Category/MenuItem for their migrated menu data.
- Route response payloads remain backward-compatible with the existing dashboard and public menu consumers.
- Photo-provider calls and image parsing remain integration concerns; normalized menu data enters `MenuService.importMenu` only after schema validation.

- [ ] **Step 1: Add failing route contract/static tests**

  Add a Node static test that the dashboard category/item/import routes do not import Prisma or call `prisma.` directly, and that required response keys/status codes remain present. Add assertions that the restaurant dashboard response and public menu page obtain their menu categories/items through the Menu Management query adapter.

- [ ] **Step 2: Run the static tests and verify red**

  Run `npm run test:domain`.

  Expected: FAIL because the current routes directly import/use Prisma.

- [ ] **Step 3: Implement mappers and repositories**

  Preserve current ordering behavior, category/item ownership checks, item moves, and the 500-row all-or-nothing import transaction. Repositories must scope every mutation by restaurant ownership before updating or deleting.

- [ ] **Step 4: Convert route handlers to thin adapters**

  Route handlers authenticate, parse/validate input, create an actor context, invoke `MenuService`, map `DomainError` to the established JSON error shape, and return the current payloads. Keep AI provider selection and image decoding in integration adapters around the application service.

- [ ] **Step 5: Run menu API/static checks**

  Run:

  ```bash
  npm run test:domain
  npm run typecheck
  npm run lint
  ```

  Expected: all tests pass, no migrated menu mutation route imports Prisma, the two composition adapters do not query Category/MenuItem directly, and lint/typecheck have no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/modules/menu-management/infrastructure src/app/api/restaurants/[id]/categories src/app/api/restaurants/[id]/items src/app/api/restaurants/[id]/import-csv src/app/api/restaurants/[id]/import-from-photo src/app/api/restaurants/[id]/route.ts src/app/menu/[slug]/page.tsx
  git commit -m "refactor: route menu management through domain services"
  ```

### Task 5: Model Ordering and Table Service domains

**Files:**
- Create: `src/modules/ordering/domain/order.ts`
- Create: `src/modules/ordering/domain/order-status.ts`
- Create: `src/modules/ordering/domain/order.test.ts`
- Create: `src/modules/ordering/ports/order-repository.ts`
- Create: `src/modules/ordering/application/order-service.ts`
- Create: `src/modules/ordering/application/order-service.test.ts`
- Create: `src/modules/table-service/domain/table-session.ts`
- Create: `src/modules/table-service/domain/waiter-call.ts`
- Create: `src/modules/table-service/domain/table-service.test.ts`
- Create: `src/modules/table-service/ports/table-service.ts`

**Interfaces:**
- `Order.create({ restaurantId, tableId, sessionId, lines, note, createdAt })` calculates the total from snapshots and starts at `NEW`.
- `Order.advanceTo(nextStatus, capability, clock)` validates both lifecycle and role capability.
- `OrderService.createStaffOrder` and `createCustomerOrder` consume `MenuCatalog.getAvailableItemSnapshots` and `TableService.getOrStartSession`.
- `OrderService.changeStatus` returns a new persisted aggregate state and a notification intent.
- `TableSessionService.getOrStartActiveSession` and `closeIfAllOrdersTerminal` preserve current session rules.
- `WaiterCall.advanceTo` enforces `PENDING → ACKNOWLEDGED/RESOLVED` and `ACKNOWLEDGED → RESOLVED`.

- [ ] **Step 1: Write failing domain tests**

  Cover order totals, quantity limits, unavailable/missing menu snapshots, legal/illegal status transitions, role capability restrictions, session closing only when all sibling orders are terminal, and waiter-call transitions.

- [ ] **Step 2: Run `npm run test:domain` and verify red**

  Expected: FAIL because the Ordering and Table Service modules do not exist.

- [ ] **Step 3: Implement pure aggregates and policies**

  Keep all status/capability rules in the module domain. Use `Clock` for timestamps and keep notification intent creation separate from push delivery.

- [ ] **Step 4: Write application tests with in-memory Menu Catalog/Table Service/Order Repository fakes**

  Prove staff and customer creation paths, price/name snapshotting, duplicate customer request handling, and no side effect is required for core order success.

- [ ] **Step 5: Run all domain tests and existing order tests**

  Run `npm run test:domain` and `npm run test:orders`.

  Expected: all new and existing order tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/modules/ordering src/modules/table-service
  git commit -m "feat: add ordering and table service domains"
  ```

### Task 6: Add Prisma adapters and migrate staff order/table routes

**Files:**
- Create: `src/modules/ordering/infrastructure/prisma/PrismaOrderRepository.ts`
- Create: `src/modules/table-service/infrastructure/prisma/PrismaTableService.ts`
- Create: `src/modules/table-service/infrastructure/prisma/PrismaWaiterCallRepository.ts`
- Create: `src/modules/shared/infrastructure/PushNotificationPort.ts`
- Modify: `src/app/api/restaurants/[id]/orders/route.ts`
- Modify: `src/app/api/restaurants/[id]/orders/[orderId]/route.ts`
- Modify: `src/app/api/restaurants/[id]/sessions/route.ts`
- Modify: `src/app/api/restaurants/[id]/sessions/[sessionId]/route.ts`
- Modify: `src/app/api/restaurants/[id]/waiter-calls/route.ts`

**Interfaces:**
- Prisma repositories map generated records to domain aggregates and own all transaction boundaries.
- `PushNotificationPort` wraps `sendPush`; failures are logged and never cause a committed order/status change to fail.
- Existing response shapes, error messages/status codes, polling behavior, and `/orders` notification URLs remain compatible.

- [ ] **Step 1: Add failing route boundary tests**

  Static checks must reject direct Prisma imports in the migrated routes and assert the routes invoke the corresponding application service factory. Add a notification-failure test around the port adapter proving the domain result remains successful.

- [ ] **Step 2: Run the checks and verify red**

  Run `npm run test:domain`.

  Expected: FAIL because the route files still contain direct Prisma business operations.

- [ ] **Step 3: Implement repositories and notification adapter**

  Keep order creation transactional with session creation/update, order/line creation, and total. Keep status updates and terminal-session closing consistent with the current schema.

- [ ] **Step 4: Convert route handlers**

  Keep authentication, actor construction, request parsing, rate-limit checks, use-case invocation, and HTTP mapping in the handlers. Remove local transition tables and role sets after the use case owns them.

- [ ] **Step 5: Run focused verification**

  Run `npm run test:domain`, `npm run test:orders`, `npm run typecheck`, and `npm run lint`.

  Expected: all pass with no migrated staff route importing Prisma.

- [ ] **Step 6: Commit**

  ```bash
  git add src/modules/ordering/infrastructure src/modules/table-service/infrastructure src/modules/shared/infrastructure src/app/api/restaurants/[id]/orders src/app/api/restaurants/[id]/sessions src/app/api/restaurants/[id]/waiter-calls
  git commit -m "refactor: migrate staff operations to domain services"
  ```

### Task 7: Migrate public menu ordering and token-scoped customer operations

**Files:**
- Create: `src/modules/table-service/application/customer-table-actor.ts`
- Modify: `src/app/api/menu/[slug]/orders/route.ts`
- Modify: `src/app/api/menu/[slug]/orders/[orderId]/route.ts`
- Modify: `src/app/api/menu/[slug]/call-waiter/route.ts`
- Modify: `src/app/menu/[slug]/page.tsx`

**Interfaces:**
- Customer actor construction validates slug, table number, table token, and the token's table/version before any use case call.
- Customer order creation maps to `OrderService.createCustomerOrder` and retains idempotency/customer request behavior.
- Public menu reads use `MenuService.getPublishedMenu` and never include unavailable items.
- Customer routes cannot access dashboard capabilities or staff-only order status transitions.

- [ ] **Step 1: Write failing customer-boundary tests**

  Test invalid/expired table tokens, cross-table tokens, unavailable item rejection, customer idempotency, and public-menu filtering.

- [ ] **Step 2: Run tests and verify red**

  Run `npm run test:domain`.

  Expected: FAIL because the customer actor adapter and migrated route boundaries do not exist.

- [ ] **Step 3: Implement customer actor and route adapters**

  Preserve current public error semantics, rate limits, order tracking behavior, waiter-call throttling, and push recipients. Keep table-token cryptography in its existing infrastructure helper.

- [ ] **Step 4: Run customer and full verification**

  Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

  Expected: all tests pass and the production build completes.

- [ ] **Step 5: Commit**

  ```bash
  git add src/modules/table-service/application src/app/api/menu/[slug] src/app/menu/[slug]/page.tsx src/components/menu/MenuClient.tsx
  git commit -m "refactor: route public ordering through domain services"
  ```

### Task 8: Add release hardening and architecture enforcement for the migrated core

**Files:**
- Create: `prisma/migrations/20260927_add_audit_events/migration.sql`
- Modify: `prisma/schema.prisma` (add additive `AuditEvent` model)
- Create: `src/modules/shared/infrastructure/prisma/PrismaAuditLog.ts`
- Create: `scripts/check-ddd-boundaries.mjs`
- Create: `.github/workflows/ci.yml`
- Modify: `src/modules/shared/application/ports.ts`
- Modify: `src/app/api/health/route.ts` if readiness checks are incomplete
- Modify: `package.json` (architecture/CI scripts)
- Create: `docs/operations/release-checklist.md`

**Interfaces:**
- `AuditEvent = { restaurantId?: string; actorId?: string; actorType?: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown>; occurredAt: Date }`.
- `PrismaAuditLog` persists sensitive menu/order/table actions without storing secrets or raw tokens.
- `check-ddd-boundaries.mjs` fails when migrated domain/application files import Prisma/Next/React or migrated route files import Prisma.
- CI runs `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `prisma validate`, and the boundary check.

- [ ] **Step 1: Write failing audit/boundary checks**

  Add tests for audit event persistence shape and a boundary script fixture that fails on an illegal Prisma import.

- [ ] **Step 2: Run checks and verify red**

  Run `npm run test:domain` and `npm run check:architecture`.

  Expected: FAIL because the audit model, adapter, and boundary script do not exist.

- [ ] **Step 3: Implement additive audit infrastructure**

  Add the model/migration, port adapter, and application hooks for menu imports/availability changes, order creation/status changes, waiter-call transitions, and session close. Audit writes must not make the primary business transaction silently succeed without logging; if the audit write fails, surface a controlled dependency error for sensitive mutations and log the correlation id.

- [ ] **Step 4: Implement boundary checks and CI**

  Use the existing Node runtime for the architecture script. Keep the checks explicit for `src/modules/*/domain`, `src/modules/*/application`, and migrated route paths; do not enforce boundaries on legacy supporting contexts until they are migrated.

- [ ] **Step 5: Add operational checklist**

  Document environment validation, migration/rollback review, backup/restore drill, Sentry verification, rate-limit configuration, owner/waiter/cook/chef/customer smoke flows, and mobile menu/order checks.

- [ ] **Step 6: Run release verification**

  Run:

  ```bash
  npm test
  npm run typecheck
  npm run lint
  npm run check:architecture
  npx prisma validate
  npm run build
  git diff --check
  ```

  Expected: all commands exit 0; lint may retain existing warnings but no new errors.

- [ ] **Step 7: Commit**

  ```bash
  git add prisma/schema.prisma prisma/migrations/20260927_add_audit_events src/modules/shared scripts/check-ddd-boundaries.mjs .github/workflows/ci.yml package.json docs/operations/release-checklist.md
  git commit -m "chore: add production gates for core domains"
  ```

## Final handoff

After Task 8, perform a whole-branch review against the spec acceptance
criteria. Then run the manual smoke matrix for owner, waiter, cook, chef, and
customer actors at desktop and mobile widths. The remaining Restaurant
Management, Staff Management, Finance/Reporting, and Integration contexts are
follow-up plans; they must use the same module boundaries before being called
fully migrated.
