import Fastify from "fastify";
import { EnvUtils } from "../utils/env.js";

/**
 * Pre-configured Fastify application singleton.
 * Registers @fastify/swagger (OpenAPI 3.1.0) and @fastify/swagger-ui (/docs) on boot.
 * Import this instance in route files and main.ts — do not create additional Fastify instances.
 */
export const fastifyApp = Fastify({
  logger: EnvUtils.envVariables().nodeEnv !== "production",
  ajv: {
    customOptions: {
      strict: false,
    },
  },
});
