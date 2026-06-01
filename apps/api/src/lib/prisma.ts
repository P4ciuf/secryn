import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { ENV } from "../config/env.js";
import { logger } from "../utils/logger.js";

const connectionString = ENV.databaseUrl;

if (!connectionString) {
  logger.error("Missing DATABASE_URL environment variable");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
