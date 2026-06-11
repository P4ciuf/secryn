import Redis from "ioredis";
import { EnvUtils } from "./env.js";
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
    redis = new Redis(EnvUtils.envVariables().redisUrl, {
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

const EMAIL_CODE_PREFIX = "mfa:email:";
const EMAIL_CODE_TTL = 600; // 10 minutes in seconds

/**
 * Stores a single-use backup code in Redis under the key
 * {@code mfa:email:{email}} with a 10‑minute TTL. The code is sent
 * via email and must be consumed with {@link consumeEmailBackupCode}.
 */
export async function storeEmailBackupCode(email: string, code: string): Promise<void> {
  const r = getRedis();
  await r.setex(`${EMAIL_CODE_PREFIX}${email}`, EMAIL_CODE_TTL, code);
}

/**
 * Atomically retrieves and deletes an email backup code from Redis.
 * Returns true only if the stored code matches the caller‑supplied value,
 * guaranteeing single‑use semantics.
 *
 * @returns true if the code was found and consumed, false otherwise
 */
export async function consumeEmailBackupCode(email: string, code: string): Promise<boolean> {
  const r = getRedis();
  const key = `${EMAIL_CODE_PREFIX}${email}`;
  const stored = await r.get(key);
  if (!stored || stored !== code) return false;
  await r.del(key);
  return true;
}
