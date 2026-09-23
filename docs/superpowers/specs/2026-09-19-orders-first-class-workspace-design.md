# Orders-First-Class Workspace Design

## Context

Menuor currently exposes restaurant operations through
`src/app/dashboard/restaurant/[id]/staff/page.tsx`. That page combines four
responsibilities: waiter-call handling, order creation, order lifecycle
management, and staff-account administration. The result makes Orders feel
like a staff sub-feature even though order handling is the restaurant's main
daily workflow.

The existing order APIs and database models are already independent of the
staff page. This change is therefore a dashboard information-architecture and
component-boundary change first, with no schema migration planned.

## Goal

Make ordering a first-class restaurant workspace while keeping staff
management focused on staff accounts, roles, and access. Existing order data,
role permissions, polling, push notifications, and waiter-call behavior must
continue to work.

## User experience

### Orders

Add `/dashboard/restaurant/[id]/orders` as the primary operational workspace.
It owns:

- live order polling and new-order notification/chime behavior;
- a Kanban board for New, Preparing, Served, and Paid orders;
- table filtering and order counts/summary metrics;
- order status transitions with the same role-specific permissions as today;
- the staff order composer for users and waiters who may create orders;
- the waiter-call queue and call-history panel as a secondary operational
  section, because calls are part of the same front-of-house workflow but are
  not staff-account management;
- browser-notification permission controls.

The Orders page must remain useful to kitchen staff: cooks and chefs can see
orders and perform only their existing allowed transitions. Owners retain full
order controls. Waiters retain order creation and their existing served/paid/
canceled transitions.

### Staff

Keep `/dashboard/restaurant/[id]/staff` as the staff-management workspace.
It owns:

- active staff counts by role;
- adding staff accounts;
- changing staff roles and active state;
- resetting passwords;
- deleting staff accounts;
- the existing confirmation and validation behavior.

Staff members must not see owner-only staff-management controls. The current
owner-only API protection remains authoritative.

### Navigation and links

- Add an `Orders` item to the restaurant sidebar navigation.
- Put Orders in the mobile quick-navigation row as the primary daily action.
- Keep Staff as a separate navigation item.
- Preserve existing restaurant switching and live-menu links.
- Change order-related push notification URLs from `/staff` to `/orders`.
- Change waiter-call push notification URLs from `/staff` to `/orders`.
- Existing `/staff` URLs must continue to resolve for bookmarks and login
  links; no redirect is required because the staff page remains valid.

## Component architecture

The current staff page is a large client component. Split responsibilities
without changing API contracts:

- `src/app/dashboard/restaurant/[id]/orders/page.tsx` becomes the route-level
  client entry point for Orders.
- `src/components/dashboard/orders/OrderBoard.tsx` owns order polling,
  filtering, Kanban rendering, status actions, metrics, and notification
  behavior.
- `src/components/dashboard/orders/OrderComposer.tsx` owns menu/table loading,
  item selection, draft totals, validation, and order creation.
- `src/components/dashboard/orders/WaiterCallQueue.tsx` owns call polling,
  acknowledgement/resolution, history, chimes, and browser notifications.
- `src/components/dashboard/orders/types.ts` contains shared client-safe
  order, menu, table, and call types.
- `src/app/dashboard/restaurant/[id]/staff/page.tsx` is reduced to the
  staff-account management UI and its existing owner-only behavior.

The route entry point may compose the three components directly. Components
should receive the restaurant id and session-derived permissions through
props or the existing `useSession` pattern. Shared behavior should be
extracted only where it serves both the Orders and Staff workspaces; avoid an
unrelated dashboard redesign.

## Data flow and permissions

Use the existing endpoints:

- `GET/POST /api/restaurants/[id]/orders`
- `PATCH /api/restaurants/[id]/orders/[orderId]`
- `GET/PATCH /api/restaurants/[id]/waiter-calls`
- `GET/PATCH/POST/DELETE /api/restaurants/[id]/staff-members`
- `GET /api/restaurants/[id]` for tables and menu items used by the composer

The client may hide unavailable controls for usability, but the API remains
the security boundary. No new role or status is introduced. The refactor must
preserve:

- owner (`USER`) full order status control and staff management;
- waiter order creation, waiter-call access, and existing waiter status
  transitions;
- cook/chef order visibility and existing kitchen status transitions;
- staff denial from staff-management APIs.

Order and call polling intervals remain 8 seconds and 3 seconds respectively
unless implementation testing shows a concrete lifecycle issue. Fetch errors
must continue to fail quietly in the background while user-triggered writes
show a toast.

## Responsive behavior

Desktop keeps a persistent restaurant sidebar with Orders before Staff. Mobile
keeps Orders in the four-action bottom navigation and leaves the remaining
settings pages behind More. The order composer remains a modal/drawer that is
usable at narrow widths. Kanban columns may scroll horizontally on small
screens but order cards must remain readable and actionable.

## Error handling and compatibility

- Preserve existing toast messages and confirmation behavior unless the new
  page context requires clearer wording.
- Escape must close the order composer and any call/staff modal that remains.
- Cancelling an order remains confirmation-protected.
- Existing `/staff` route, API routes, session shape, and order status values
  remain backward-compatible.
- Push notification links must land on the new Orders page, including links
  opened while the app is installed as a PWA.

## Testing and verification

The repository currently has no test script. Add focused unit tests only if a
small pure helper is extracted; do not introduce a new test framework for this
UI split. Verification consists of:

1. `npm run lint`.
2. `npm run build`.
3. Static checks that no order UI or order polling remains in the Staff route,
   and that all order/call push URLs target `/orders`.
4. Manual smoke checks for owner, waiter, and kitchen-staff sessions at both
   desktop and mobile widths: navigation, loading, create order, transition
   order, acknowledge/resolution of calls, and staff CRUD.

## Non-goals

- No database or Prisma schema changes.
- No changes to customer-facing menu ordering.
- No redesign of unrelated restaurant dashboard pages.
- No real-time transport migration; retain the current polling and push
  notification mechanisms.
