import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { EnvUtils } from "../utils/env.js";
import { logger } from "@repo/shared";

const connectionString = EnvUtils.variables.databaseUrl;

if (!connectionString) {
  logger.error("Missing DATABASE_URL environment variable");
  // Hard-stop: without a database connection the application cannot operate
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
/**
 * Pre-configured Prisma client singleton using the Postgres adapter.
 * Import this module to query the database instead of creating a new client.
 */
const prisma = new PrismaClient({ adapter });

export { prisma };
