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
su-exec nextjs sh ./scripts/seed-prod.sh || echo "Seed step finished."

echo "Starting server..."
exec su-exec nextjs node server.js
