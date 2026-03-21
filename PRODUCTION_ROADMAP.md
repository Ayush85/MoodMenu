# MoodMenu Production Roadmap

## Goal
Turn MoodMenu into a realistic, secure, and operationally strong restaurant/cafe platform.

## Phase 1: Security Baseline (in progress)
- Strong password policy for user and staff accounts.
- Normalize and validate emails before persistence.
- Remove hardcoded secrets from runtime config.
- Enforce role-based authorization in API endpoints.

## Phase 2: Operational Reliability
- Add structured logging with request IDs.
- Add health endpoints: liveness, readiness, DB readiness.
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

## Immediate Next Milestones
1. Add audit log model and middleware to record sensitive actions.
2. Add invitation-based staff onboarding and self-service password setup.
3. Build kitchen board UI with real-time status lanes.
4. Add shift management and table lifecycle states.
