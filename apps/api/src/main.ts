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

try {
  EnvUtils.checkEnv();
} catch (error) {
  logger.error("Critical environment variables are missing, aborting.", { error });
  process.exit(1);
}

const ENV = EnvUtils.envVariables();
const port = Number(ENV.port);
const app = fastifyApp;

app.register(cookie);
app.register(helmet, { global: true });
app.register(fastifyRateLimit, { max: 50, timeWindow: "1 minute" });
app.register(cors, { origin: true, credentials: true });
app.register(fastifyJwt, { secret: ENV.jwtSecret });

// Swagger must be registered before routes so its onRoute hook is active
app.register(fastifySwagger, {
  openapi: {
    openapi: "3.1.0",
    info: {
      title: "SecureVault API",
      version: "0.0.1",
      description: "REST API for SecureVault — a secure credential and secret management service.",
    },
    servers: [{ url: "https://securevault.cc/api" }],
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
app.register(loadRoutes);

// Resolves the entire plugin tree before the server starts accepting connections
await app.ready();

app.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    logger.error("Error starting server", { err });
    process.exit(1);
  }
  logger.info(`Server running on port ${port}`);
});
