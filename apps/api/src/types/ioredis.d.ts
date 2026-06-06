/**
 * Type augmentation for the ioredis package.
 *
 * Extends the upstream {@link https://github.com/redis/ioredis | ioredis}
 * type declarations with the subset of the Redis client API used by the
 * SecureVault backend. This file exists because the default ioredis types
 * do not declare `pipeline()` or `multi()` on the `Redis` class itself
 * (they are only available via the `ChainableCommander`-returning static
 * helpers), yet the app calls them directly on the client instance.
 *
 * Keeping declarations scoped to what the app actually uses prevents
 * stale signatures from accumulating when the upstream package evolves.
 */
declare module "ioredis" {
  import { EventEmitter } from "events";

  interface RedisOptions {
    lazyConnect?: boolean;
    retryStrategy?: (times: number) => number | null;
    [key: string]: unknown;
  }

  /**
   * Augmented Redis client class.
   *
   * Declares the ioredis methods consumed by the application on top of the
   * `EventEmitter` base. Only the signatures actively called are listed;
   * the full ioredis API remains available through the package's own types.
   */
  class Redis extends EventEmitter {
    constructor(url: string, options?: RedisOptions);
    setex(key: string, seconds: number, value: string): Promise<string>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
    on(event: "error", listener: (err: Error) => void): this;
    /**
     * Creates a pipeline for batching multiple commands into a single
     * network round-trip. Used by {@link AuthService.incrementFailedLogin}
     * to atomically increment the brute-force counter and refresh its TTL.
     */
    pipeline(): ChainableCommander;
    /**
     * Creates a MULTI/EXEC transaction block. Available for atomic
     * multi-command operations but not currently used in production paths.
     */
    multi(): ChainableCommander;
  }

  export default Redis;
}
