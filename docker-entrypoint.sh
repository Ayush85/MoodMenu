#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy
echo "Migrations applied successfully."

echo "Seeding database if empty..."
node scripts/seed-prod.js || echo "Seed skipped or already applied."

echo "Starting server..."
exec node server.js
