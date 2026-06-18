import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { EnvUtils } from "../utils/env";
import { logger } from "@repo/shared";

let _prisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!_prisma) {
    const connectionString = EnvUtils.variables.databaseUrl;

    if (!connectionString) {
      logger.error("Missing DATABASE_URL environment variable");
      process.exit(1);
    }

    const adapter = new PrismaPg({ connectionString });
    _prisma = new PrismaClient({ adapter });
  }
  return _prisma;
}

/**
 * Lazy-initialized Prisma client singleton using the Postgres adapter.
 * The underlying PrismaClient is created on first access, not at module
 * load time, so that environment variables are not required during build.
 *
 * Usage is transparent — `prisma.user.findFirst(...)` works identically
 * to a direct PrismaClient instance.
 */
type ClientRecord = Record<string | symbol, unknown>;

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client as unknown as ClientRecord, prop, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
  set(_target, prop, value) {
    const client = getPrismaClient();
    return Reflect.set(client as unknown as ClientRecord, prop, value, client);
  },
  has(_target, prop) {
    const client = getPrismaClient();
    return Reflect.has(client as unknown as ClientRecord, prop);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const client = getPrismaClient();
    return Reflect.getOwnPropertyDescriptor(client, prop);
  },
  ownKeys(_target) {
    const client = getPrismaClient();
    return Reflect.ownKeys(client as unknown as object);
  },
});
