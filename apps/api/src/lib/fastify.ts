import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

/**
 * Pre-configured Fastify application singleton.
 * Registers @fastify/swagger (OpenAPI 3.1.0) and @fastify/swagger-ui (/docs) on boot.
 * Import this instance in route files and main.ts — do not create additional Fastify instances.
 */
export const fastifyApp = Fastify({ logger: true });

// Root-level OpenAPI spec — individual routes contribute schema objects
fastifyApp.register(fastifySwagger, {
  openapi: {
    openapi: "3.1.0",
    info: {
      title: "SecureVault API",
      version: "0.0.1",
      description: "REST API for SecureVault — a secure credential and secret management service.",
    },
    servers: [
      {
        url: "https://securevault.cc/api",
      },
    ],
  },
});

fastifyApp.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: true,
  },
});
