# Menuor Production Roadmap

## Goal

Turn Menuor into a realistic, secure, and operationally strong restaurant/cafe platform.

## Current State Snapshot (2026-09-12)

What's already built: multi-tenant menu platform (Next.js + Prisma/Postgres),
mood-adaptive theming by weather/time (`src/lib/mood-engine.ts`), table sessions,
waiter calls, orders, staff roles, offers, expenses, custom-domain provisioning,
QR codes, push notifications, and AI-assisted menu import/image generation.

Gaps found in review that aren't reflected in the phases below yet:

- Restaurant-access authorization is re-implemented per API route (e.g.
  `getRestaurantAccess` duplicated across `orders/route.ts`, `analytics/route.ts`)
  instead of a shared helper — a missed check in a new route is a data leak.
- No rate limiting beyond an ad-hoc DB query in `call-waiter/route.ts` (1
  pending call / 2 min / table). Public order/session endpoints have no
  equivalent throttle.
- No automated tests and no CI (no `.github/workflows`, no test script in
  `package.json`). Every deploy relies on manual verification.
- Analytics (`analytics/route.ts`) covers revenue/expenses only — no
  bestsellers, no call-to-order conversion, no time-of-day breakdown, despite
  the data already existing in `OrderLine` / `WaiterCall`.
- No startup validation for the large optional-secrets surface (Cloudinary,
  AI providers, Firebase, weather, Pexels) — a missing key degrades a feature
  silently instead of failing a health check.

## Immediate Priorities

### Now (weeks 1-3) — harden what's live

1. Extract a shared `requireRestaurantAccess(id, session)` helper and migrate
   existing routes onto it.
2. Add an audit log for sensitive actions (status changes, refunds, staff
   role edits) — cheap now, expensive to retrofit later (pulls forward part
   of Phase 5).
3. Add IP/token-bucket rate limiting on public `menu/[slug]/*` routes (order,
   call-waiter, session). In-memory is fine pre-Redis (Phase 6).
4. Stand up CI: lint + `tsc --noEmit` + `prisma migrate diff` check on every
   PR.
5. Add `/api/health` (liveness + DB ping) for Docker/nginx and the
   domain-provisioner service to depend on.

### Next (weeks 4-8) — reorders Phase 3/4 below by ROI

6. Table lifecycle + shift handover (additive on top of existing
   `TableSession` model).
7. Staff invite-by-email-token flow, replacing direct password creation in
   the staff-members route.
8. Kitchen display / station view, filtering the existing live/SSE page by
   `OrderStatus`.
9. Richer analytics: bestsellers, call-to-order conversion, hourly heatmap —
   additive queries over existing `OrderLine`/`WaiterCall` data.

### Later (2-3 months out) — scale and compliance

10. Redis for rate limiting; replace the polling live page with pub/sub.
11. Split bills / partial payment; void/refund with manager approval.
12. Data retention + PII export/delete workflow; Postgres backup/restore
    drill.
13. E2E tests (waiter call → kitchen → paid) once CI exists to run them in.

## Phase 1: Security Baseline (in progress)

- Strong password policy for user and staff accounts. — done
  (`src/lib/password-policy.ts`)
- Normalize and validate emails before persistence. — done
  (`src/lib/password-policy.ts`)
- Remove hardcoded secrets from runtime config. — done (`.env` is gitignored,
  `.env.example` documents required vars)
- Enforce role-based authorization in API endpoints. — partial; logic exists
  per-route but is duplicated (see "Now" item 1 above).

## Phase 2: Operational Reliability

- Add structured logging with request IDs.
- Add health endpoints: liveness, readiness, DB readiness. (see "Now" item 5)
- Add centralized API error shape and error codes.
- Add retry/backoff for external weather API.
- Add background cleanup for stale pending calls/orders.

## Phase 3: Core Real-World Restaurant Flows

- Shift handover: open/close shift and unresolved-call handoff.
- Kitchen display mode: station-based views (grill/bar/cold).
- Table lifecycle: seated, ordering, eating, billing, cleaned.
- Split bills and partial payment support.
- Void/refund flow with manager approval and audit trail.
- Menu availability windows (breakfast/lunch/dinner) and stock-outs.

## Phase 4: Staff and Access Governance

- Staff invitation flow with expiring invite links.
- Password reset workflow by email token (not prompt-based).
- Device/session management and forced sign-out.
- Fine-grained permissions per role and per restaurant.

## Phase 5: Compliance and Data Protection

- Audit log for sensitive actions (status change, user role, staff disable).
- Data retention policy for calls/orders/logs.
- PII minimization and export/delete workflows.
- Backups and restore drills for PostgreSQL.

## Phase 6: Scale and Performance

- Introduce Redis for distributed cache/rate limiting.
- Replace polling SSE source with pub/sub event fanout.
- Add query indexes for high-frequency order/call lookups.
- Add load test scenarios for peak dining hours.

## Phase 7: Quality Gates

- Unit and integration tests for APIs and auth rules.
- E2E tests for waiter and kitchen workflows.
- Security checks (dependency audit, secret scanning, CWE scans).
- CI pipeline with lint, test, build, migration verification.

See "Immediate Priorities" above for the current ordered milestone list.
