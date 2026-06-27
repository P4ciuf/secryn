import { UserService } from "@/services/user";
import { logger } from "@repo/shared";
import { getRedis } from "@/db/redis";
import { Prisma } from "@prisma/client";
import cron from "node-cron";

const LOCK_KEY = "cron:disable-not-verified-users";
const LOCK_TTL = 3600;

/**
 * Scheduled job that runs daily at midnight UTC to disable user accounts that
 * were created more than 7 days ago but have never verified their email.
 *
 * Uses a Redis distributed lock (`cron:disable-not-verified-users`) to prevent
 * concurrent execution when multiple app instances are running. The lock
 * auto-expires after 1 hour (LOCK_TTL) to prevent deadlocks if a process
 * crashes.
 *
 * @see UserService.disableUsers — the service method that performs the actual
 *   bulk disable operation.
 */
export const disableUnverifiedUsersAfter7Days = cron.schedule("0 0 * * *", async () => {
  const redis = getRedis();

  const acquired = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL, "NX");
  if (!acquired) {
    logger.debug("Cron job already running on another instance, skipping");
    return;
  }

  try {
    const userService = await UserService.Instance(null);
    const query: Prisma.UserWhereInput = {
      isVerified: false,
      createdAt: {
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    };
    await userService.disableUsers(query);
    logger.info("Disabled unverified accounts created more than 7 days ago");
  } finally {
    await redis.del(LOCK_KEY);
  }
});
