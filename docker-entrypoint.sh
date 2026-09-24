#!/bin/sh
set -e

# The uploads dir is a bind mount from the host, so it can be owned by
# whatever user created it there (often root). Fix ownership here — while
# we're still root — before dropping to the unprivileged app user below.
UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
mkdir -p "$UPLOAD_DIR"
chown -R nextjs:nodejs "$UPLOAD_DIR"

echo "Running database migrations..."
su-exec nextjs node node_modules/prisma/build/index.js migrate deploy
echo "Migrations applied successfully."

echo "Running seed..."
# Best-effort: a seed failure shouldn't block the server from starting, but
# it must not look identical to a success in the logs either — swallowing
# the exit code entirely made a broken/misconfigured seed script silently
# no-op on every deploy with nothing to alert on.
if su-exec nextjs sh ./scripts/seed-prod.sh; then
  echo "Seed step finished successfully."
else
  echo "WARNING: seed step failed (exit code $?) — continuing startup anyway. Check scripts/seed-prod.sh." >&2
fi

echo "Starting server..."
exec su-exec nextjs node server.js
