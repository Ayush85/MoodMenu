# Menu-first Modular Monolith DDD Design

## Context

Menuor is a multi-restaurant platform with a menu editor, public QR menus,
customer ordering, staff order-taking, table sessions, waiter calls, staff
accounts, offers, expenses, analytics, custom domains, and AI-assisted menu
import. The current implementation is organized mainly around Next.js routes
and shared Prisma access. This makes business rules easy to duplicate, lets
authorization drift between endpoints, and makes it difficult to add a
workflow without understanding unrelated UI and persistence code.

The product's primary value is menu management. Restaurant operations are the
second half of the same workflow: staff and customers place orders from the
managed menu, orders are associated with tables and sessions, and the kitchen
advances them through a controlled lifecycle.

## Goal

Evolve Menuor into a production-ready, menu-first restaurant operating
platform through an incremental Domain-Driven Design migration. The result
must improve maintainability, security boundaries, and feature velocity while
preserving current user flows, API contracts, and historical order data.

DDD is an internal architecture choice. Market success is validated through a
clear product wedge and real restaurant usage:

> A restaurant can manage its menu quickly, publish it reliably, take accurate
> orders from it, and move those orders through the kitchen with minimal delay.

## Product priorities

The first release-quality core must make these workflows trustworthy:

1. An owner can create, organize, import, enrich, price, publish, and make
   menu items available or unavailable.
2. Customers see the current available menu without seeing unavailable items.
3. Owners and authorized waiters can create orders from available menu items.
4. Orders preserve item name and price snapshots even after the menu changes.
5. Tables and sessions provide the operational context for orders and waiter
   calls.
6. Owners, waiters, cooks, and chefs can perform only their allowed actions.
7. A production operator can observe failures, recover from database issues,
   and audit sensitive changes.

## Bounded contexts

### Identity and Access

Owns actors, authentication identity, restaurant membership, staff roles, and
authorization policies. It answers whether an actor may act on a restaurant
and which capabilities that actor has. It does not own menu, order, or table
business behavior.

### Restaurant Management

Owns restaurant identity, branding, public slug/domain settings, layout
preferences, WiFi configuration, and tenant-level configuration. Other
contexts reference a restaurant by identity; they do not load a complete
Restaurant graph to perform their work.

### Menu Management (core domain)

Owns categories, menu items, ordering, prices, descriptions, tags, images,
specials, availability, CSV/photo import, and management/public menu views.
It is the source of truth for what may be ordered now. It does not create
orders or decide staff permissions.

### Table Service (core supporting domain)

Owns restaurant tables, table sessions, session lifecycle, and waiter calls.
It provides the table/session context used by Ordering and does not own menu
item pricing or order status transitions.

### Ordering (core domain)

Owns order creation, immutable order-line snapshots, totals, order status
transitions, and order notification intents. It asks Menu Management for
available item data and Table Service for a valid table/session context. It
does not query Prisma menu or table tables directly.

### Finance and Reporting (supporting contexts)

Owns expenses, offers, analytics projections, and operational reporting. These
contexts consume stable outputs from Menu Management, Table Service, and
Ordering rather than reaching through their repositories.

### Presentation and Integrations (supporting contexts)

Owns public menu layout rendering, landing pages, image providers, weather,
Cloudinary, push notifications, email, QR generation, and custom-domain
provisioning. These are adapters or supporting capabilities, not the source
of core restaurant rules.

## Target module structure

The first migration uses a modular monolith. Modules are deployed together,
but their domain and application code has explicit dependency boundaries.

```text
src/modules/
  shared/
    domain/
    application/
  identity-access/
    domain/
    application/
    ports/
    infrastructure/prisma/
  restaurant-management/
    domain/
    application/
    ports/
    infrastructure/prisma/
  menu-management/
    domain/
    application/
    ports/
    infrastructure/prisma/
  table-service/
    domain/
    application/
    ports/
    infrastructure/prisma/
  ordering/
    domain/
    application/
    ports/
    infrastructure/prisma/
  finance-reporting/
    application/
    infrastructure/prisma/
```

Next.js route handlers remain the HTTP adapters under `src/app/api`. Existing
React pages and components remain presentation adapters. A route handler may
parse input, obtain an actor, invoke an application use case, and map a
domain/application result to the existing response shape. It must not contain
Prisma queries or business transition rules after its module is migrated.

Dependency direction is inward:

```text
Next route / UI adapter
        ↓
Application use case
        ↓
Domain model + ports
        ↑
Prisma / push / AI / email adapters
```

Domain code cannot import Next.js, Prisma, React, environment variables, or
external provider SDKs. Infrastructure code is the only layer allowed to
translate Prisma records into domain objects and back.

## Domain model and rules

### Menu Management

The menu context models a restaurant-scoped catalog. Categories and items keep
their existing database identity and display ordering, while the domain
protects the following invariants:

- A category belongs to exactly one restaurant.
- A menu item belongs to exactly one restaurant through its category.
- Names are trimmed and cannot be empty.
- Prices are finite and non-negative; currency formatting is a presentation
  concern.
- Display order is an integer within the owning category or category list.
- Availability is explicit and only available items can be offered to a new
  order.
- Moving an item validates the target category belongs to the same
  restaurant.
- Imports validate every row before writing and remain all-or-nothing.
- Deleting or moving an item cannot mutate existing order-line snapshots.

The first use cases are:

- `CreateCategory`
- `RenameCategory`
- `ReorderCategories`
- `DeleteCategory`
- `CreateMenuItem`
- `UpdateMenuItem`
- `MoveMenuItem`
- `ReorderMenuItems`
- `SetMenuItemAvailability`
- `DeleteMenuItem`
- `ImportMenu`
- `GetManagementMenu`
- `GetPublishedMenu`

The query side may use read models shaped for the dashboard and public menu.
That is an application optimization, not permission to place query logic in
React components or route handlers.

### Ordering

`Order` is the aggregate root. `OrderLine` records the menu name, quantity,
unit price, and line total at creation time. The aggregate owns total
calculation and legal status transitions:

```text
NEW → PREPARING → SERVED → PAID
  └──────────────→ CANCELED
PREPARING ───────→ CANCELED
```

Role capability is separate from lifecycle validity:

- Owners may use all existing order transitions.
- Waiters may create orders and use `SERVED`, `PAID`, and `CANCELED` where the
  lifecycle allows it.
- Cooks and chefs may use `PREPARING`, `SERVED`, and `CANCELED` where the
  lifecycle allows it.
- No caller may bypass a legal transition merely because its role allows the
  destination status.

Order creation requires an available catalog item, a table in the same
restaurant, and a valid active or newly-created table session. The operation
must be transactional: session creation/update, order creation, line creation,
and total calculation either all commit or all fail.

### Table Service

`TableSession` owns the active/closed lifecycle and accumulated total for a
table visit. It is closed only when all of its orders are terminal according to
the current product rule. `WaiterCall` owns its own transition policy:

```text
PENDING → ACKNOWLEDGED → RESOLVED
PENDING ───────────────→ RESOLVED
```

Waiter-call access remains limited to owners and waiters. Cooks and chefs can
see and process orders but cannot use the waiter-call workflow.

## Application contracts and ports

Each migrated context exposes application use cases with explicit command and
result types. Commands contain primitive input values and an `ActorContext`;
they do not accept `NextRequest`, Prisma types, or session objects.

Shared application contracts include:

- `ActorContext`: actor id, actor type, optional staff role, and restaurant
  scope.
- `RestaurantAccessPolicy`: resolves tenant access and capability checks.
- `DomainError`: stable code, safe message, and optional field details.
- `Clock`: provides current time to domain logic and tests.
- `TransactionRunner`: supplies one transaction boundary to repositories.
- `NotificationPort`: sends order/call notification intents without making
  the core transaction depend on provider availability.

Context ports include:

- `MenuCatalog`: load available item snapshots and manage menu commands.
- `MenuRepository`: persist categories/items/import batches.
- `TableService`: validate tables and get-or-start active sessions.
- `OrderRepository`: load, create, and update order aggregates.
- `WaiterCallRepository`: load and transition calls.

Prisma adapters implement these ports under each module's
`infrastructure/prisma` directory. The existing schema is the persistence
starting point; the first migration does not require renaming or replacing
tables.

## Authorization and security

All authenticated restaurant routes use one access resolver from
Identity and Access. It returns a typed access result or a not-found outcome
without confirming a tenant id to an unrelated actor.

Capabilities are expressed as policies, not scattered `actorType` branches:

- `manage_menu`: owner only.
- `view_orders`: owner, waiter, cook, chef.
- `create_staff_order`: owner, waiter.
- `advance_order`: owner or role-specific policy.
- `manage_waiter_calls`: owner, waiter.
- `manage_staff`: owner only.

Public customer ordering remains a separate actor flow authenticated by the
existing restaurant slug, table number, and table token. It must use the same
Menu Catalog and Ordering application contracts without gaining dashboard
capabilities.

Request bodies are validated at the route/application boundary with Zod or
equivalent typed schemas. Domain validation is still required because use
cases may be called by more than one adapter.

## Error handling and side effects

Application errors use stable codes mapped by HTTP adapters:

- `UNAUTHENTICATED` → 401
- `NOT_FOUND` → 404
- `FORBIDDEN` → 403 or the existing tenant-hiding 404 policy
- `VALIDATION_FAILED` → 400
- `CONFLICT` → 409
- `RATE_LIMITED` → 429
- `DEPENDENCY_UNAVAILABLE` → 503 where the request cannot complete safely

Order creation and status changes do not fail because push notification
delivery is unavailable. The application emits a notification intent after a
successful transaction, logs provider failures with request context, and
keeps the primary business action committed. An outbox is a later scaling
option; the initial design does not introduce a separate message broker.

Sensitive actions—menu import, availability changes, staff changes, order
status changes, and session close—produce structured audit events. Existing
logging and Sentry integration remain adapters around application failures;
they do not replace domain error handling.

## Production-readiness gates

The DDD migration is not considered release-ready until these gates are
implemented or explicitly accepted as a release decision:

- Centralized tenant and role authorization covers every migrated route.
- Public order, waiter-call, and import endpoints have rate limits and input
  size limits.
- Order creation is idempotent for retried customer requests and safe under
  duplicate submissions.
- Database migrations are applied and verified in CI before deployment.
- Liveness/readiness checks, structured logs, request IDs, and Sentry errors
  identify failed use cases without leaking secrets or personal data.
- Automated backups have a documented restore drill.
- CI runs lint, typecheck, domain tests, API/integration tests where available,
  production build, and migration verification.
- Health, access, menu, order, and session metrics are available for a pilot
  restaurant.
- Existing owner, waiter, cook, chef, and customer flows pass a manual smoke
  checklist on desktop and mobile.

## Migration strategy

The migration follows a strangler pattern. Each context is introduced behind
the existing route/API contract, then routes are moved one endpoint group at a
time.

### Phase 0: Architecture foundation

Add module conventions, shared domain errors, actor/capability types, test
helpers, and dependency rules. No user-visible behavior changes.

### Phase 1: Identity and access

Move restaurant access resolution and capability policies out of route-local
functions. Migrate orders, waiter calls, menu mutations, staff, tables,
sessions, and analytics routes to the shared policy without widening access.

### Phase 2: Menu Management vertical slice

Move category/item CRUD, reorder operations, CSV import, photo import
normalization, dashboard menu reads, and public menu reads behind Menu
Management use cases and Prisma adapters. Preserve existing response shapes,
availability behavior, and all-or-nothing import behavior.

### Phase 3: Ordering and Table Service vertical slice

Move staff and customer order creation, order status transitions, session
creation/closing, and waiter-call transitions behind their application use
cases. Use the Menu Catalog port for available item snapshots and retain
existing order/call notification destinations.

### Phase 4: Supporting contexts

Migrate restaurant settings, staff management, offers, expenses, analytics,
domain provisioning, QR, and AI/media integrations using the same boundaries.
Keep reporting queries read-oriented and prevent them from becoming write-side
domain dependencies.

At the end of each phase, the old route implementation is removed only after
the new use case has passed contract, domain, and smoke verification. No
parallel duplicate business rule is allowed to remain as an undocumented
fallback.

## Testing strategy

The existing Node test runner remains the default; no React testing framework
is required for the domain migration.

- Domain unit tests cover menu invariants, price validation, category/item
  ownership, order totals, order transitions, session closing, call
  transitions, and capabilities.
- Application tests use in-memory fakes for ports and prove transaction/error
  behavior without Prisma.
- Repository tests run against a disposable Postgres/database environment when
  the test environment supports it, verifying mappings and transaction
  boundaries.
- Static contract checks ensure migrated route handlers do not import Prisma or
  duplicate access/status rules.
- Existing UI/source tests remain for the order composer and mobile behavior.
- The release suite runs `npm test`, `npm run typecheck`, `npm run lint`,
  `npm run build`, migration verification, and the owner/waiter/kitchen/customer
  smoke checklist.

## Non-goals for the first migration

- Splitting the application into microservices.
- Introducing a message broker or distributed event platform.
- Replacing Prisma or the existing PostgreSQL schema wholesale.
- Rewriting the public menu UI as part of the architecture migration.
- Adding payments, reservations, delivery, payroll, or inventory management.
- Claiming market success from code structure alone; product-market fit must be
  validated with real restaurant pilots and operational metrics.

## Acceptance criteria

The first implementation plan is successful when:

1. Menu Management, Identity and Access, Ordering, and Table Service have
   explicit module boundaries and pure domain/application code.
2. Migrated route handlers contain no direct Prisma business logic.
3. Dashboard menu management and public menu behavior remain compatible.
4. Staff and customer order creation still uses immutable menu snapshots.
5. Authorization tests prove owner, waiter, cook, chef, and customer boundaries.
6. Menu imports remain atomic and reject invalid prices/names/categories before
   writes.
7. Existing order-composer UX tests and full production verification remain
   green.
8. The repository documents the remaining migration phases rather than
   pretending the entire product has been converted in one change.
