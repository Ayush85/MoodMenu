#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy
echo "Migrations applied successfully."

echo "Running seed..."
sh ./scripts/seed-prod.sh || echo "Seed step finished."

echo "Starting server..."
exec node server.js
