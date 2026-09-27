# Production release checklist

## Before deployment

- Confirm production `DATABASE_URL`, `NEXTAUTH_SECRET`, auth providers, storage, push, email, and Sentry configuration are present in the deployment secret store.
- Run `npx prisma validate`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run check:architecture`, and `npm run build` against the release commit.
- Review the generated Prisma migration and take a verified database backup before applying it.
- Confirm a rollback owner and recovery window. Database rollbacks must use a forward migration or restore procedure; do not edit an applied migration.

## Smoke test after deployment

- Owner: sign in, create/rename/reorder a category, create/edit an item, toggle availability, and verify the public menu.
- Waiter: open staff ordering, select a table, add items, submit an order, update its status, and resolve a waiter call.
- Kitchen: view the order queue and move an order through the permitted kitchen statuses.
- Customer: scan a table QR link, view only available items, submit the same request twice, and confirm only one order is created.
- Session: close a table session and confirm terminal orders and session totals remain consistent.

## Observability and operations

- Verify health checks, structured request logs, error tracking, notification failure logs, and database connection metrics.
- Monitor `AuditEvent` writes and investigate repeated `DEPENDENCY_UNAVAILABLE` responses.
- Review audit events for menu availability changes, menu imports, order creation/status changes, waiter calls, and session closes.
- Confirm rate limits and alert thresholds for public ordering and waiter-call endpoints.
- Verify backup restoration in a non-production environment on the release cadence.
