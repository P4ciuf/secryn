#!/bin/sh
# -----------------------------------------------------------------------------
# secryn container entrypoint
# -----------------------------------------------------------------------------
# Description: Container startup sequence for the Secryn Next.js application.
#              Starts the cron daemon, registers a periodic job to disable
#              unverified user accounts, pushes the Prisma schema to the
#              database, and launches Next.js as the foreground process.
# Usage:       Set as ENTRYPOINT in the Dockerfile — no manual invocation.
# Dependencies: crond (busybox), node, tsx, npx (prisma), next
# Exit codes:
#   0   Success (Next.js runs until signalled)
#   1   Prisma db push or Next.js startup failed (set -e propagates errors)
# -----------------------------------------------------------------------------
set -e

# --- Cron setup ------------------------------------------------------------
# crond is provided by busybox on Alpine Linux — no extra packages needed.
# -b: fork into the background so the script continues.
# -l 8: log level 8 (logs each job execution to the container stdout).
crond -b -l 8

# Register the hourly cron job.
# /proc/1/fd/1 is PID 1's stdout, so cron output appears in `docker logs`.
echo "0 * * * * /usr/local/bin/node /secryn/node_modules/.bin/tsx /secryn/app/scripts/disableNotVerifiedUsers.ts >> /proc/1/fd/1 2>&1" | crontab -

# --- Database schema push --------------------------------------------------
# set -e guarantees the container exits non-zero if this step fails,
# preventing the app from starting with a mismatched database schema.
npx prisma db push --accept-data-loss

# --- Application start -----------------------------------------------------
# exec replaces this shell process. Next.js becomes PID 1 and receives
# signals (SIGTERM, SIGINT) directly from Docker, allowing graceful shutdown.
exec npx next start
