import Redis from "ioredis";
import { EnvUtils } from "../utils/env";
import { logger } from "@repo/shared";

let redis: Redis | null = null;

/**
 * Lazy‑initialized Redis connection singleton.
 *
 * Uses lazy connect to allow the server to start even when Redis is
 * temporarily unreachable. The retry strategy gives up after 5 attempts
 * with an exponential‑backoff‑like delay capped at 2 seconds.
 *
 * @returns A shared ioredis instance, creating it on first invocation
 */
export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(EnvUtils.variables.redisUrl, {
      lazyConnect: true,
      retryStrategy(times: number) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });

    redis.on("error", (err: Error) => {
      logger.error("[Redis] Connection error", { error: err.message });
    });
  }

  return redis;
}
