#!/bin/sh
set -e

# Auto-provisions nginx + Let's Encrypt TLS for restaurant custom domains.
#
# Runs on the HOST, not inside the app container — it needs nginx and
# certbot, which live outside Docker (the app is only reachable at
# 127.0.0.1:3030). Install once on the VPS, then schedule via cron, e.g.
# every 5 minutes:
#
#   */5 * * * * DATABASE_URL='postgresql://...' /opt/menuor/scripts/provision-domains.sh >> /var/log/menuor-domain-provision.log 2>&1
#
# Requires on the host: psql, dig, nginx, certbot (with the nginx plugin —
# the same tooling already used for the manual `certbot --nginx -d ...` step).
#
# Keeps nginx in sync with the domains assigned in the database:
#   1. Removes stale nginx configs for domains no longer assigned
#   2. Confirms DNS actually resolves to this server
#   3. Writes an nginx server block proxying to the app
#   4. Runs certbot to issue + install the certificate for pending domains
#   5. Marks the restaurant's domainVerifiedAt in the database on success
#
# A domain that fails certbot is skipped for an hour before retrying, to
# stay well under Let's Encrypt's per-hostname failure rate limit.

SERVER_IPS="${SERVER_IPS:-168.144.77.104}"
UPSTREAM="http://127.0.0.1:3030"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-ayushrestha8585@gmail.com}"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
STATE_DIR="/var/lib/menuor/domain-provision"
LOCKFILE="/var/lock/menuor-domain-provision.lock"
FAILURE_COOLDOWN_SECONDS=3600
MANAGED_MARKER="# Managed by Menuor custom-domain automation"

log() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL must be set" >&2
  exit 1
fi

mkdir -p "$STATE_DIR"
ACTIVE_DOMAINS_FILE=$(mktemp)
trap 'rm -f "$ACTIVE_DOMAINS_FILE"' EXIT

exec 9>"$LOCKFILE"
if ! flock -n 9; then
  log "Another run is already in progress — exiting"
  exit 0
fi

psql "$DATABASE_URL" -tAc \
  'SELECT "customDomain" FROM "Restaurant" WHERE "customDomain" IS NOT NULL;' > "$ACTIVE_DOMAINS_FILE"

cleanup_changed=0
for conf in "$NGINX_SITES_AVAILABLE"/*.conf; do
  [ -e "$conf" ] || continue
  if ! grep -qF "$MANAGED_MARKER" "$conf"; then
    continue
  fi

  domain=$(basename "$conf" .conf)
  if grep -Fxq "$domain" "$ACTIVE_DOMAINS_FILE"; then
    continue
  fi

  log "CLEANUP $domain: no longer assigned, removing nginx config"
  rm -f "$NGINX_SITES_ENABLED/$domain.conf" "$NGINX_SITES_AVAILABLE/$domain.conf" "$STATE_DIR/$domain.failed"
  cleanup_changed=1
done

for fail_marker in "$STATE_DIR"/*.failed; do
  [ -e "$fail_marker" ] || continue
  domain=$(basename "$fail_marker" .failed)
  if grep -Fxq "$domain" "$ACTIVE_DOMAINS_FILE"; then
    continue
  fi

  rm -f "$fail_marker"
done

if [ "$cleanup_changed" -eq 1 ]; then
  if nginx -t; then
    nginx -s reload
  else
    log "FAIL cleanup: nginx config test failed after removing stale domains"
    exit 1
  fi
fi

matches_expected_ip() {
  resolved_ips="$1"

  for expected_ip in $(echo "$SERVER_IPS" | tr ',' ' '); do
    if printf '%s\n' "$resolved_ips" | grep -Fxq "$expected_ip"; then
      return 0
    fi
  done

  return 1
}

domains=$(psql "$DATABASE_URL" -F '|' -tAc \
  'SELECT "customDomain", CASE WHEN "domainVerifiedAt" IS NULL THEN '\''pending'\'' ELSE '\''verified'\'' END FROM "Restaurant" WHERE "customDomain" IS NOT NULL;')

echo "$domains" | while IFS='|' read -r domain status; do
  [ -z "$domain" ] && continue

  if ! echo "$domain" | grep -Eq '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'; then
    log "SKIP $domain: does not look like a valid hostname"
    continue
  fi

  fail_marker="$STATE_DIR/$domain.failed"
  if [ "$status" = "pending" ] && [ -f "$fail_marker" ]; then
    last_fail=$(stat -c %Y "$fail_marker" 2>/dev/null || echo 0)
    now=$(date +%s)
    if [ $((now - last_fail)) -lt "$FAILURE_COOLDOWN_SECONDS" ]; then
      log "SKIP $domain: recent failure, cooling down"
      continue
    fi
  fi

  resolved_ips=$(dig +short "$domain" A | sed '/^$/d')
  if ! matches_expected_ip "$resolved_ips"; then
    resolved_display=$(printf '%s\n' "$resolved_ips" | paste -sd, -)
    [ -n "$resolved_display" ] || resolved_display="none"
    log "SKIP $domain: DNS not pointing here yet (got: $resolved_display, expected one of: $SERVER_IPS)"
    continue
  fi

  conf_path="$NGINX_SITES_AVAILABLE/$domain.conf"
  link_path="$NGINX_SITES_ENABLED/$domain.conf"

  if [ "$status" = "pending" ] || [ ! -f "$conf_path" ]; then
    log "PROVISION $domain: DNS OK, writing nginx config"

    cat > "$conf_path" <<CONF
$MANAGED_MARKER
server {
    listen 80;
    server_name $domain;

    location / {
        proxy_pass $UPSTREAM;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
CONF

    ln -sf "$conf_path" "$link_path"

    if ! nginx -t; then
      log "FAIL $domain: nginx config test failed, rolling back"
      rm -f "$link_path" "$conf_path"
      touch "$fail_marker"
      continue
    fi
    nginx -s reload
  fi

  if [ "$status" = "verified" ]; then
    rm -f "$fail_marker"
    continue
  fi

  if certbot --nginx -d "$domain" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect; then
    log "OK $domain: certificate issued"
    rm -f "$fail_marker"
    psql "$DATABASE_URL" -v domain="$domain" <<'SQL'
UPDATE "Restaurant" SET "domainVerifiedAt" = now() WHERE "customDomain" = :'domain';
SQL
  else
    log "FAIL $domain: certbot failed, will retry after cooldown"
    touch "$fail_marker"
  fi
done
