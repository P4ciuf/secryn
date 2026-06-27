#!/bin/sh
# ---------------------------------------------------------------------------
# disable-unverified-users.sh
# ---------------------------------------------------------------------------
# Runs the disable-unverified-users cron job safely from the host via Docker.
# Uses Redis distributed locking to ensure only one instance runs at a time,
# even when multiple app replicas are deployed on the VPS.
#
# Usage:
#   chmod +x scripts/disable-unverified-users.sh
#   ./scripts/disable-unverified-users.sh
#
# Host crontab (runs daily at midnight UTC):
#   0 0 * * * /home/user/secryn/scripts/disable-unverified-users.sh >> /var/log/secryn-cron.log 2>&1
#
# If you use the host crontab, disable the internal Next.js cron by setting
# ENABLE_BUILTIN_CRON=false in app/.env (see instrumentation.ts).
# ---------------------------------------------------------------------------

set -e

# ---------------------------------------------------------------------------
# Configuration — adjust these paths to your VPS setup
# ---------------------------------------------------------------------------
COMPOSE_DIR="/home/user/secryn"
LOCK_KEY="cron:disable-not-verified-users"
LOCK_TTL=3600 # 1 hour — prevents deadlock if the script is killed

# ---------------------------------------------------------------------------
# Resolve compose directory
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ "$COMPOSE_DIR" = "/home/user/secryn" ] && [ ! -f "$COMPOSE_DIR/docker-compose.yml" ]; then
  # Auto-detect: script is inside the project, go one level up from scripts/
  COMPOSE_DIR="$(dirname "$SCRIPT_DIR")"
fi

if [ ! -f "$COMPOSE_DIR/docker-compose.yml" ]; then
  echo "[ERROR] docker-compose.yml not found in $COMPOSE_DIR" >&2
  exit 1
fi

cd "$COMPOSE_DIR"

# ---------------------------------------------------------------------------
# 1. Acquire Redis distributed lock
# ---------------------------------------------------------------------------
ACQUIRED=$(docker compose exec -T redis redis-cli SET "$LOCK_KEY" "1" EX "$LOCK_TTL" NX 2>/dev/null)

if [ "$ACQUIRED" != "OK" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S'): Job already running on another instance, skipping."
  exit 0
fi

# ---------------------------------------------------------------------------
# 2. Run the disable logic inside the app container
# ---------------------------------------------------------------------------
echo "$(date '+%Y-%m-%d %H:%M:%S'): Acquired lock, starting disable job..."

docker compose exec -T app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await prisma.user.updateMany({
      where: {
        isVerified: false,
        isActive: true,
        createdAt: { lt: sevenDaysAgo },
      },
      data: {
        isActive: false,
        disabledAt: new Date(),
      },
    });
    console.log('Disabled ' + result.count + ' unverified user(s)');
  } finally {
    await prisma.\$disconnect();
  }
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
" 2>&1

EXIT_CODE=$?

# ---------------------------------------------------------------------------
# 3. Release the Redis lock
# ---------------------------------------------------------------------------
docker compose exec -T redis redis-cli DEL "$LOCK_KEY" > /dev/null 2>&1

if [ $EXIT_CODE -ne 0 ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S'): Job FAILED (exit code $EXIT_CODE)"
  exit $EXIT_CODE
fi

echo "$(date '+%Y-%m-%d %H:%M:%S'): Job completed successfully."


