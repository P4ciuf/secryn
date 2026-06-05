declare module "ioredis" {
  import { EventEmitter } from "events";

  interface RedisOptions {
    lazyConnect?: boolean;
    retryStrategy?: (times: number) => number | null;
    [key: string]: unknown;
  }

  class Redis extends EventEmitter {
    constructor(url: string, options?: RedisOptions);
    setex(key: string, seconds: number, value: string): Promise<string>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
    on(event: "error", listener: (err: Error) => void): this;
  }

  export default Redis;
}
