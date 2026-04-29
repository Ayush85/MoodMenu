#!/bin/sh
set -e

# Start postgres normally in the background using the standard entrypoint.
# exec inside docker-entrypoint.sh replaces the subshell with the postgres
# process, so $PG_PID remains valid for the final wait.
docker-entrypoint.sh postgres &
PG_PID=$!

# Wait for postgres to accept connections via local Unix socket (trust auth).
until pg_isready -U "${POSTGRES_USER}" -q 2>/dev/null; do
  sleep 1
done

# Sync the password from the current POSTGRES_PASSWORD env var.
# Local socket uses trust auth so no password is needed to run this command.
echo "ALTER USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';" \
  | psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

wait $PG_PID
