# Orders-First-Class Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make restaurant ordering a first-class `/orders` workspace, reduce `/staff` to staff-account management, and preserve waiter calls, role permissions, polling, push notifications, and responsive navigation.

**Architecture:** Extract the current staff page's order, order-composer, and waiter-call responsibilities into focused client components under `src/components/dashboard/orders/`. Extract staff-account state/UI into a focused staff component, then compose it from the existing route. Keep the existing APIs and Prisma models unchanged; centralize order transition rules in a pure helper so the behavior can be tested independently of React.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript strict mode, Tailwind CSS v4 utility classes, NextAuth session roles, existing Prisma API routes, Node's built-in test runner through the repository's existing `tsx` dev dependency.

**Spec:** `docs/superpowers/specs/2026-09-19-orders-first-class-workspace-design.md`

## Global Constraints

- “No database or Prisma schema changes.”
- “No changes to customer-facing menu ordering.”
- “No real-time transport migration; retain the current polling and push notification mechanisms.”
- “Order and call polling intervals remain 8 seconds and 3 seconds respectively.”
- “The client may hide unavailable controls for usability, but the API remains the security boundary.”
- Existing `/staff` URLs, API routes, session shape, and order status values remain backward-compatible.
- Do not add a React testing framework; use the existing `tsx` dependency with Node's built-in test runner for pure helper tests.

## Review Focus

- A kitchen staff session must see `/orders` and order cards but must not see owner-only staff-account controls; pin transition permissions in `permissions.test.ts` and verify the route's session gating during the final smoke check.
- A waiter must retain order creation and only the existing waiter transitions; pin allowed statuses in `permissions.test.ts` and verify the composer/status controls manually.
- A stale `/staff` bookmark must still render a valid page without order polling or order-composer UI; static-check the route and smoke-test the page as owner and staff.
- A push notification opened from a new order or waiter call must land on `/orders`, including the PWA start URL; static-check every producer and inspect the manifest response logic.
- Narrow screens must keep the composer usable and the Kanban horizontally navigable; verify at mobile width during the final smoke pass.

---

### Task 1: Extract and test shared order types and transition permissions

**Files:**
- Create: `src/components/dashboard/orders/types.ts`
- Create: `src/components/dashboard/orders/permissions.ts`
- Create: `src/components/dashboard/orders/permissions.test.ts`
- Modify: `package.json` (add the built-in order-helper test command)

**Interfaces:**
- Produces `OrderStatus`, `StaffRole`, `ActorType`, `OrderLine`, `OrderTicket`, `MenuItemOption`, `RestaurantTableData`, `WaiterCall`, and `RawWaiterCall` types for the extracted components.
- Produces `getAllowedOrderStatuses(actorType, staffRole): OrderStatus[]`.
- Produces `getNextSuggestedStatus(actorType, staffRole, currentStatus): OrderStatus | null`.

- [ ] **Step 1: Write the failing permission tests**

  Add one assertion per behavior below to `permissions.test.ts` using `node:test` and `node:assert/strict`:

  ```ts
  test("owner can choose every order status", () => {
    assert.deepEqual(
      getAllowedOrderStatuses("USER", undefined),
      ["NEW", "PREPARING", "SERVED", "PAID", "CANCELED"],
    );
  });

  test("waiters can only move orders through front-of-house statuses", () => {
    assert.deepEqual(getAllowedOrderStatuses("STAFF", "WAITER"), ["SERVED", "PAID", "CANCELED"]);
  });

  test("kitchen staff can prepare, serve, or cancel orders", () => {
    assert.deepEqual(getAllowedOrderStatuses("STAFF", "CHEF"), ["PREPARING", "SERVED", "CANCELED"]);
  });

  test("suggested status follows each role's existing workflow", () => {
    assert.equal(getNextSuggestedStatus("USER", undefined, "NEW"), "PREPARING");
    assert.equal(getNextSuggestedStatus("STAFF", "WAITER", "PREPARING"), "SERVED");
    assert.equal(getNextSuggestedStatus("STAFF", "COOK", "SERVED"), null);
  });
  ```

- [ ] **Step 2: Run the tests and verify the expected red failure**

  Add this package script to `package.json` before running:

  ```json
  "test:orders": "node --import tsx --test src/components/dashboard/orders/permissions.test.ts"
  ```

  Run `npm run test:orders`.

  Expected: the test command fails because `permissions.ts` and its exported functions do not exist yet.

- [ ] **Step 3: Implement the minimal shared types and helper**

  Define the literal unions in `types.ts`, then implement `permissions.ts` with the exact role rules already present in `staff/page.tsx`:

  ```ts
  export function getAllowedOrderStatuses(actorType: ActorType | undefined, staffRole: StaffRole | undefined): OrderStatus[] {
    if (actorType === "USER") return ["NEW", "PREPARING", "SERVED", "PAID", "CANCELED"];
    if (staffRole === "WAITER") return ["SERVED", "PAID", "CANCELED"];
    if (staffRole === "COOK" || staffRole === "CHEF") return ["PREPARING", "SERVED", "CANCELED"];
    return [];
  }
  ```

  `getNextSuggestedStatus` must preserve the current owner, waiter, and kitchen progression and return `null` for terminal or unsupported statuses.

- [ ] **Step 4: Run the focused tests and then the type/lint checks**

  Run `npm run test:orders` and `npm run lint`.

  Expected: all permission tests pass and lint exits with code 0.

- [ ] **Step 5: Commit the shared contract**

  ```bash
  git add package.json src/components/dashboard/orders/types.ts src/components/dashboard/orders/permissions.ts src/components/dashboard/orders/permissions.test.ts
  git commit -m "refactor: extract order permission rules"
  ```

### Task 2: Extract the waiter-call queue and order composer

**Files:**
- Create: `src/components/dashboard/orders/WaiterCallQueue.tsx`
- Create: `src/components/dashboard/orders/OrderComposer.tsx`

**Interfaces:**
- Consumes `WaiterCall`, `RawWaiterCall`, `OrderTicket`, `MenuItemOption`, `RestaurantTableData`, and the permissions types from Task 1.
- Produces `WaiterCallQueue` with props `{ restaurantId: string; canUseCalls: boolean }`.
- Produces `OrderComposer` with props `{ restaurantId: string; canTakeOrders: boolean; open: boolean; onClose: () => void; onCreated: (order: OrderTicket) => void }`.

- [ ] **Step 1: Copy the call behavior into `WaiterCallQueue` without changing the API contract**

  Move the existing call polling behavior from `staff/page.tsx` into the component:

  - poll `GET /api/restaurants/${restaurantId}/waiter-calls` every 3 seconds;
  - skip the first-fetch chime, then chime and notify only newly pending calls;
  - sort pending calls before acknowledged calls, oldest first within each status;
  - PATCH `{ callId, status }` to acknowledge or resolve;
  - retain the call-history toggle and resolved count;
  - render the current focus call, remaining queue, history, and disabled/loading action states;
  - return an empty/no-access state when `canUseCalls` is false rather than polling.

- [ ] **Step 2: Copy the order-composer behavior into `OrderComposer`**

  Move the existing table/menu fetch, search, category grouping, quantity controls, draft total, clear action, and modal markup into the component:

  - load `GET /api/restaurants/${restaurantId}` when the composer opens or the restaurant changes;
  - include only available menu items in the selectable list;
  - keep category order supplied by the API;
  - require a table and at least one item before submitting;
  - POST the existing `{ tableId, note, items: [{ itemName, quantity, unitPrice }] }` payload;
  - show the existing toast/error behavior;
  - call `onCreated(createdOrder)` after a successful 201 response, then clear the draft and close;
  - keep Escape and backdrop close behavior.

- [ ] **Step 3: Run lint after the extraction**

  Run `npm run lint`.

  Expected: no unused state/import errors from the moved code and exit code 0.

- [ ] **Step 4: Commit the extracted operational components**

  ```bash
  git add src/components/dashboard/orders/types.ts src/components/dashboard/orders/WaiterCallQueue.tsx src/components/dashboard/orders/OrderComposer.tsx
  git commit -m "refactor: extract order composer and waiter calls"
  ```

### Task 3: Build the first-class Orders route and board

**Files:**
- Create: `src/app/dashboard/restaurant/[id]/orders/page.tsx`
- Create: `src/components/dashboard/orders/OrderBoard.tsx`

**Interfaces:**
- Consumes the Task 1 permission helpers and Task 2 `OrderComposer`/`WaiterCallQueue` interfaces.
- Produces the user-visible `/dashboard/restaurant/[id]/orders` route.

- [ ] **Step 1: Move the order board state and polling into `OrderBoard`**

  Port the existing order logic from `staff/page.tsx`:

  - poll `GET /api/restaurants/${restaurantId}/orders` every 8 seconds;
  - skip the first-fetch order chime and chime only when a new `NEW` id appears later;
  - show New, Preparing, Served, and Paid columns; keep canceled orders out of the Kanban lanes;
  - retain table filtering, paid revenue, active queue, ready-to-close counts, stale-order highlighting, item lines, notes, and order totals;
  - use `getAllowedOrderStatuses` and `getNextSuggestedStatus` for every action instead of duplicating role branches;
  - keep cancel confirmation via `ConfirmModal`;
  - PATCH `/api/restaurants/${restaurantId}/orders/${orderId}` and replace the updated order in local state;
  - open `OrderComposer` only when `canTakeOrders` is true and prepend created orders to the board;
  - render `WaiterCallQueue` below or beside the board so calls remain operationally visible without being part of staff management.

- [ ] **Step 2: Add the route-level page shell**

  Use `useParams` and `useSession` consistently with the existing dashboard pages. Render a focused header with “Orders” and the restaurant workflow subtitle, then render `OrderBoard` with:

  ```ts
  const actorType = session?.user?.actorType;
  const staffRole = actorType === "STAFF" ? (session?.user?.role as StaffRole | undefined) : undefined;
  const canTakeOrders = actorType === "USER" || staffRole === "WAITER";
  const canUseCalls = actorType === "USER" || staffRole === "WAITER";
  ```

  Use the same role values consumed by the API; do not grant controls based on the URL.

- [ ] **Step 3: Run the focused tests, lint, and a production build**

  Run:

  ```bash
  npm run test:orders
  npm run lint
  npm run build
  ```

  Expected: permission tests pass, lint exits 0, and Next.js completes a production build with the new route.

- [ ] **Step 4: Commit the Orders workspace**

  ```bash
  git add src/app/dashboard/restaurant/[id]/orders/page.tsx src/components/dashboard/orders/OrderBoard.tsx
  git commit -m "feat: add first-class orders workspace"
  ```

### Task 4: Reduce Staff to staff-account management

**Files:**
- Create: `src/components/dashboard/staff/StaffManagement.tsx`
- Modify: `src/app/dashboard/restaurant/[id]/staff/page.tsx`

**Interfaces:**
- Consumes `restaurantId: string`, `canManageStaff: boolean`, and the existing `useSession`, `useToast`, `ConfirmModal`, and password-policy behavior.
- Produces a staff page with staff CRUD only; no order types, order polling, waiter-call polling, order composer, or order status handlers.

- [ ] **Step 1: Create the failing static contract check**

  Add a shell check to the task notes/verification command that must return no matches:

  ```bash
  ! rg -n "OrderTicket|waiter-calls|/orders|showComposer|fetchOrders|fetchCalls|selectedItems" 'src/app/dashboard/restaurant/[id]/staff/page.tsx'
  ```

  Run it before editing.

  Expected: it fails because the current Staff route still contains those symbols.

- [ ] **Step 2: Move staff state, handlers, and markup into `StaffManagement`**

  Preserve these current behaviors exactly:

  - fetch staff only when `canManageStaff` is true;
  - POST new staff with name/email/password/phone/role;
  - PATCH role, active state, and password;
  - DELETE only after confirmation;
  - keep owner-only role and active-count controls;
  - keep `validatePassword`, password visibility toggle, reset modal, confirm modal, and Escape handling.

  When `canManageStaff` is false, render a small owner-only explanation rather than an empty page. Do not fetch the staff-members endpoint from a staff session.

- [ ] **Step 3: Make the route a focused wrapper**

  Keep `staff/page.tsx` as a client route that reads `id` and session actor type, then renders `StaffManagement`. The route must contain no order or waiter-call imports/state/effects.

- [ ] **Step 4: Run the static contract check, lint, and focused tests**

  Run:

  ```bash
  ! rg -n "OrderTicket|waiter-calls|/orders|showComposer|fetchOrders|fetchCalls|selectedItems" 'src/app/dashboard/restaurant/[id]/staff/page.tsx'
  npm run test:orders
  npm run lint
  ```

  Expected: the static check succeeds with no output, permission tests pass, and lint exits 0.

- [ ] **Step 5: Commit the focused Staff workspace**

  ```bash
  git add src/app/dashboard/restaurant/[id]/staff/page.tsx src/components/dashboard/staff/StaffManagement.tsx
  git commit -m "refactor: focus staff workspace on account management"
  ```

### Task 5: Update navigation, login entry points, PWA, and notification destinations

**Files:**
- Modify: `src/components/dashboard/Sidebar.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/dashboard/restaurant/[id]/manifest.webmanifest/route.ts`
- Modify: `src/app/api/restaurants/[id]/orders/route.ts`
- Modify: `src/app/api/restaurants/[id]/orders/[orderId]/route.ts`
- Modify: `src/app/api/menu/[slug]/call-waiter/route.ts`
- Modify: `src/app/dashboard/restaurant/[id]/design/page.tsx` only for stale Staff Panel copy that describes ordering as part of Staff

**Interfaces:**
- Consumes the existing restaurant nav and session route behavior.
- Produces consistent entry points to `/dashboard/restaurant/[id]/orders` for owners, waiters, cooks, and chefs.

- [ ] **Step 1: Add Orders to desktop and mobile navigation**

  Add an Orders item before Menu in `RESTAURANT_NAV`. Use `ClipboardList` or the existing inline icon style consistently. For owners, make the mobile four-action row `Orders`, `Menu`, `Staff`, and `More`; keep Offers and other settings reachable in the sidebar/drawer. For staff sessions, make Orders the primary quick action and remove the Staff-management destination from the staff-only quick navigation.

- [ ] **Step 2: Update staff login and PWA entry points**

  Change staff login routing from:

  ```ts
  router.push(`/dashboard/restaurant/${rid}/staff`);
  ```

  to:

  ```ts
  router.push(`/dashboard/restaurant/${rid}/orders`);
  ```

  Change the staff PWA `start_url` to `/orders` and update its description to refer to orders and waiter calls. Keep the owner PWA start URL on the menu dashboard.

- [ ] **Step 3: Update push notification URLs**

  Replace only dashboard destinations in the order-create, order-status, and waiter-call notification payloads with `/dashboard/restaurant/${id}/orders` or `/dashboard/restaurant/${restaurant.id}/orders`. Keep payload data and recipient selection unchanged.

- [ ] **Step 4: Run static destination checks**

  Run:

  ```bash
  rg -n "url: .*dashboard/restaurant.*(staff|orders)|startUrl|router.push" src/app/api src/app/'(auth)' src/app/dashboard/restaurant/[id]/manifest.webmanifest/route.ts
  rg -n "suffix: \"/orders\"|label: \"Orders\"|/orders" src/components/dashboard/Sidebar.tsx
  ```

  Expected: all operational order/call destinations point to `/orders`; `/staff` remains only as the staff-management route and owner navigation label.

- [ ] **Step 5: Run tests, lint, and build**

  Run:

  ```bash
  npm run test:orders
  npm run lint
  npm run build
  ```

  Expected: all permission tests pass, lint exits 0, and the production build completes.

- [ ] **Step 6: Commit navigation and entry-point changes**

  ```bash
  git add src/components/dashboard/Sidebar.tsx src/app/(auth)/login/page.tsx src/app/dashboard/restaurant/[id]/manifest.webmanifest/route.ts src/app/api/restaurants/[id]/orders/route.ts src/app/api/restaurants/[id]/orders/[orderId]/route.ts src/app/api/menu/[slug]/call-waiter/route.ts src/app/dashboard/restaurant/[id]/design/page.tsx
  git commit -m "feat: make orders a primary dashboard destination"
  ```

### Task 6: Final verification and handoff

**Files:**
- Verify: all files changed by Tasks 1–5

**Interfaces:**
- Consumes the complete Orders and Staff split.
- Produces evidence that the requested behavior is implemented and that no stale Staff-owned order flow remains.

- [ ] **Step 1: Run the complete automated verification**

  Run:

  ```bash
  npm run test:orders
  npm run lint
  npm run build
  git diff --check HEAD~5..HEAD
  ```

  Expected: permission tests pass, lint and build exit 0, and `git diff --check` prints no whitespace errors. The implementation commits are based on spec commit `812eb1d`, so use `git diff --check 812eb1d..HEAD`.

- [ ] **Step 2: Run the final static ownership checks**

  ```bash
  ! rg -n "OrderTicket|waiter-calls|fetchOrders|fetchCalls|selectedItems|showComposer" 'src/app/dashboard/restaurant/[id]/staff/page.tsx'
  rg -n "dashboard/restaurant/.*orders" src/app/api src/app/'(auth)' src/components/dashboard/Sidebar.tsx src/app/dashboard/restaurant/[id]/manifest.webmanifest/route.ts
  ```

  Expected: the Staff route has no operational order/call symbols and all order/call entry points include `/orders`.

- [ ] **Step 3: Perform manual role and responsive smoke checks**

  In a running local app, verify:

  1. Owner: Orders appears before Menu; order board, call queue, composer, and Staff CRUD all work.
  2. Waiter: login opens Orders; composer and calls work; owner-only staff controls are absent.
  3. Cook/Chef: Orders opens; order cards and kitchen transitions work; composer and staff CRUD controls are absent.
  4. Order creation updates the board immediately and a new-order notification points to Orders.
  5. A waiter call can be acknowledged/resolved and its notification points to Orders.
  6. Mobile navigation exposes Orders, Menu, Staff for owners, and Orders as the staff primary action; the composer and Kanban remain usable.

- [ ] **Step 4: Review the final diff and report any manual limitation**

  Run `git status --short` and `git diff --stat 812eb1d..HEAD`. Report exact automated results, the smoke checks performed, and any manual check blocked by missing local credentials/database.
