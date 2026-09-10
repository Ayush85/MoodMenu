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
# For each restaurant with a customDomain but no domainVerifiedAt yet:
#   1. Confirms DNS actually resolves to this server (skips otherwise —
#      retried next run once the owner's DNS propagates)
#   2. Writes an nginx server block proxying to the app
#   3. Runs certbot to issue + install the certificate
#   4. Marks the restaurant's domainVerifiedAt in the database on success
#
# A domain that fails certbot is skipped for an hour before retrying, to
# stay well under Let's Encrypt's per-hostname failure rate limit.

SERVER_IP="168.144.77.104"
UPSTREAM="http://127.0.0.1:3030"
CERTBOT_EMAIL="ayushrestha8585@gmail.com"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
STATE_DIR="/var/lib/menuor/domain-provision"
LOCKFILE="/var/lock/menuor-domain-provision.lock"
FAILURE_COOLDOWN_SECONDS=3600

log() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL must be set" >&2
  exit 1
fi

mkdir -p "$STATE_DIR"

exec 9>"$LOCKFILE"
if ! flock -n 9; then
  log "Another run is already in progress — exiting"
  exit 0
fi

pending=$(psql "$DATABASE_URL" -tAc \
  'SELECT "customDomain" FROM "Restaurant" WHERE "customDomain" IS NOT NULL AND "domainVerifiedAt" IS NULL;')

echo "$pending" | while IFS= read -r domain; do
  [ -z "$domain" ] && continue

  if ! echo "$domain" | grep -Eq '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'; then
    log "SKIP $domain: does not look like a valid hostname"
    continue
  fi

  fail_marker="$STATE_DIR/$domain.failed"
  if [ -f "$fail_marker" ]; then
    last_fail=$(stat -c %Y "$fail_marker" 2>/dev/null || echo 0)
    now=$(date +%s)
    if [ $((now - last_fail)) -lt "$FAILURE_COOLDOWN_SECONDS" ]; then
      log "SKIP $domain: recent failure, cooling down"
      continue
    fi
  fi

  resolved_ip=$(dig +short "$domain" A | tail -n1)
  if [ "$resolved_ip" != "$SERVER_IP" ]; then
    log "SKIP $domain: DNS not pointing here yet (got: ${resolved_ip:-none}, expected: $SERVER_IP)"
    continue
  fi

  log "PROVISION $domain: DNS OK, writing nginx config"

  cat > "$NGINX_SITES_AVAILABLE/$domain.conf" <<CONF
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

  ln -sf "$NGINX_SITES_AVAILABLE/$domain.conf" "$NGINX_SITES_ENABLED/$domain.conf"

  if ! nginx -t; then
    log "FAIL $domain: nginx config test failed, rolling back"
    rm -f "$NGINX_SITES_ENABLED/$domain.conf" "$NGINX_SITES_AVAILABLE/$domain.conf"
    touch "$fail_marker"
    continue
  fi
  nginx -s reload

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
