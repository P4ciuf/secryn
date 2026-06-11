import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyJwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import { fastifyApp } from "./lib/fastify.js";
import { EnvUtils } from "./utils/env.js";
import { loadRoutes } from "./utils/loader.js";
import { logger } from "./core/logger/index.js";
import { authenticate } from "./core/auth/plugin.js";
import { registerErrorHandler } from "./core/errors/errorHandler.js";

/**
 * Secryn API server bootstrap.
 *
 * Registration order matters:
 *   1. Validate environment variables and fail fast on missing critical config.
 *   2. Register transport-level middleware (cookie, helmet, CORS, rate-limit).
 *   3. Register JWT plugin so it is available when route schemas reference it.
 *   4. Register Swagger before routes — its {@code onRoute} hook must be active
 *      when routes are added, otherwise OpenAPI metadata is not collected.
 *   5. Register all route modules under the {@code /api/v1} prefix via the
 *      auto-loader.
 *   6. Attach the global error handler.
 *   7. Call {@code app.ready()} explicitly to resolve the plugin tree and catch
 *      registration errors before {@code listen()} binds the port.
 *   8. Bind to {@code 0.0.0.0:PORT} and start accepting connections.
 */

try {
  EnvUtils.checkEnv();
} catch (error) {
  logger.error("Critical environment variables are missing, aborting.", { error });
  process.exit(1);
}

const ENV = EnvUtils.envVariables();
const port = Number(ENV.port);
const app = fastifyApp;

// Root-level decorator — inherited by all plugin contexts (including siblings)
app.decorate("authenticate", authenticate);

app.register(cookie);
app.register(helmet, { global: true });
app.register(fastifyRateLimit, { max: 50, timeWindow: "1 minute" });

// CORS origins are restricted to APP_URL by default; set CORS_ORIGINS (comma-
// separated) to allow additional origins for multi-domain deployments.
app.register(cors, {
  origin: ENV.corsOrigins?.split(",").map((o) => o.trim()) ?? [ENV.appUrl],
  credentials: true,
});

app.register(fastifyJwt, { secret: ENV.jwtSecret });

// Swagger must be registered before routes so its onRoute hook is active
app.register(fastifySwagger, {
  openapi: {
    openapi: "3.1.0",
    info: {
      title: "Secryn API",
      version: "0.0.1",
      description: "REST API for Secryn — a secure credential and secret management service.",
    },
    servers: [{ url: "https://secryn.cc/api" }],
  },
});

app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: true,
  },
});

// Routes registered as a plugin — Fastify resolves the full plugin tree in order during ready(),
// so Swagger's onRoute hook is guaranteed to be active when these routes are added
app.register(loadRoutes, {
  prefix: "/api/v1",
});

registerErrorHandler(app);

// Fail fast: resolve plugin tree explicitly before listen() to catch registration errors early
await app.ready();

app.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    logger.error("Error starting server", { err });
    process.exit(1);
  }
  logger.info(`Server running on port ${port}`);
});
