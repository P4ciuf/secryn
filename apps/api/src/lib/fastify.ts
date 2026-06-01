import Fastify from "fastify";

/**
 * Pre-configured Fastify application singleton.
 * Registers @fastify/swagger (OpenAPI 3.1.0) and @fastify/swagger-ui (/docs) on boot.
 * Import this instance in route files and main.ts — do not create additional Fastify instances.
 */
export const fastifyApp = Fastify({ logger: true });
