#!/bin/sh
# Interactive: creates a SUPER_ADMIN user, or promotes an existing one.
# An existing user keeps all its data. Its password changes only if you type a
# new one; leave the password empty to keep the current one.
#
# Run inside the app container (it already has DATABASE_URL, psql, bcryptjs):
#   docker cp scripts/create-super-admin.sh menuor-app:/tmp/create-super-admin.sh
#   docker exec -it menuor-app sh /tmp/create-super-admin.sh
set -e

: "${DATABASE_URL:?DATABASE_URL is not set}"

restore_tty() { stty echo 2>/dev/null || true; }
trap restore_tty EXIT INT TERM

printf "Email: "
read -r SU_EMAIL
case "$SU_EMAIL" in
  ?*@?*.?*) ;;
  *) echo "Invalid email." >&2; exit 1 ;;
esac

printf "Name [Super Admin]: "
read -r SU_NAME
SU_NAME=${SU_NAME:-Super Admin}

stty -echo 2>/dev/null || true
printf "Password (leave empty to keep the current one if the user exists): "
read -r SU_PW
printf "\n"
if [ -n "$SU_PW" ]; then
  printf "Confirm password: "
  read -r SU_PW2
  printf "\n"
  restore_tty
  if [ "$SU_PW" != "$SU_PW2" ]; then echo "Passwords do not match." >&2; exit 1; fi
  # Same rules as the register form.
  if [ "${#SU_PW}" -lt 8 ] \
    || ! printf %s "$SU_PW" | grep -q '[A-Z]' \
    || ! printf %s "$SU_PW" | grep -q '[a-z]' \
    || ! printf %s "$SU_PW" | grep -q '[0-9]' \
    || ! printf %s "$SU_PW" | grep -q '[^A-Za-z0-9]'; then
    echo "Password needs 8+ chars with upper, lower, number and a special character." >&2
    exit 1
  fi
fi
restore_tty

export SU_PW
if [ -n "$SU_PW" ]; then
  HASH=$(node -e 'require("bcryptjs").hash(process.env.SU_PW,12).then(h=>process.stdout.write(h))')
else
  HASH=""
fi
ID="su$(node -e 'process.stdout.write(require("crypto").randomBytes(10).toString("hex"))')"

# A new user needs a password; an existing one can keep theirs.
EXISTS=$(psql "$DATABASE_URL" -tA -v ON_ERROR_STOP=1 -v email="$SU_EMAIL" <<'SQL'
SELECT count(*) FROM "User" WHERE email = lower(:'email');
SQL
)
if [ "$EXISTS" = "0" ] && [ -z "$HASH" ]; then
  echo "No such user yet, so a password is required." >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v email="$SU_EMAIL" -v name="$SU_NAME" -v hash="$HASH" -v id="$ID" <<'SQL'
INSERT INTO "User" (id, email, name, password, role, "isActive")
VALUES (:'id', lower(:'email'), :'name', NULLIF(:'hash', ''), 'SUPER_ADMIN', true)
ON CONFLICT (email) DO UPDATE
  SET role = 'SUPER_ADMIN',
      "isActive" = true,
      password = COALESCE(NULLIF(:'hash', ''), "User".password);
SELECT email, role, "isActive" FROM "User" WHERE email = lower(:'email');
SQL

echo "Done. Sign out and back in, then open /admin."
