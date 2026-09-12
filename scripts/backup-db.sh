#!/bin/sh
set -e

# Dumps the "db" compose service's Postgres database to a local, gitignored
# directory, and prunes backups older than $RETENTION_DAYS.
#
# Run manually:
#   ./scripts/backup-db.sh
#
# Or on a schedule via host cron (daily at 2am), from the project root:
#   0 2 * * * cd /opt/menuor && ./scripts/backup-db.sh >> /var/log/menuor-backup.log 2>&1
#
# Restore a backup:
#   docker compose cp .dbbackup/menuor_<timestamp>.dump db:/tmp/restore.dump
#   docker compose exec db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists /tmp/restore.dump

cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
[ -f .env ] && . ./.env

POSTGRES_USER="${POSTGRES_USER:-menuor}"
POSTGRES_DB="${POSTGRES_DB:-menuor}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_DIR=".dbbackup"

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
OUT_FILE="$BACKUP_DIR/menuor_${STAMP}.dump"

echo "Backing up '$POSTGRES_DB' to $OUT_FILE ..."
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$OUT_FILE"

SIZE=$(du -h "$OUT_FILE" | cut -f1)
echo "Backup complete: $OUT_FILE ($SIZE)"

echo "Pruning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name 'menuor_*.dump' -mtime "+$RETENTION_DAYS" -print -delete
