#!/bin/sh
set -e

# Backs up the app's Postgres database when it's a native (non-Docker)
# install on the host — e.g. production, where `postgresql.service` owns
# port 5432 directly rather than a compose-managed "db" container. For the
# local Docker Compose setup, use scripts/backup-db.sh instead.
#
# Run manually:
#   ./scripts/backup-db-vps.sh
#
# Schedule via cron (daily at 2am), from the project root:
#   0 2 * * * cd /opt/menuor && ./scripts/backup-db-vps.sh >> /var/log/menuor-backup.log 2>&1
#
# Restore a backup (run on the host — note localhost, not
# host.docker.internal, same reasoning as HOST_DATABASE_URL below):
#   pg_restore -d "postgresql://menuor:<password>@localhost:5432/menuor" --no-owner --clean --if-exists /path/to/menuor_<timestamp>.dump
#
# Requires on the host: pg_dump (already present — postgresql-client-18 per
# the apt listing).

cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
[ -f .env ] && . ./.env

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set (checked .env and the environment). Aborting." >&2
  exit 1
fi

# .env's DATABASE_URL is written for the app container, where
# host.docker.internal resolves to the host gateway. This script runs
# directly on the host (that's the whole point, for a native Postgres
# install), where the equivalent address is just localhost.
HOST_DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/host\.docker\.internal/localhost/')

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_DIR="${BACKUP_DIR:-/root/menuor-backups}"

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
OUT_FILE="$BACKUP_DIR/menuor_${STAMP}.dump"

echo "Backing up database to $OUT_FILE ..."
pg_dump "$HOST_DATABASE_URL" -Fc > "$OUT_FILE"

SIZE=$(du -h "$OUT_FILE" | cut -f1)
echo "Backup complete: $OUT_FILE ($SIZE)"

echo "Pruning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name 'menuor_*.dump' -mtime "+$RETENTION_DAYS" -print -delete
