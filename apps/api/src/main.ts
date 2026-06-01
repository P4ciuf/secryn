import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { fastifyApp } from "./lib/fastify.js";
import { EnvUtils } from "./utils/env.js";
import { loadRoutes } from "./utils/loader.js";
import { logger } from "./utils/logger.js";

// Validate required env vars before any plugin registration — fail fast on missing configuration
try {
  EnvUtils.checkEnv();
} catch (error) {
  logger.error("Critical environment variables are missing, aborting.", { error });
  process.exit(1);
}

const ENV = EnvUtils.envVariables();
const port = Number(ENV.port);
const app = fastifyApp;

app.register(helmet, { global: true });

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

app.register(fastifyRateLimit, {
  max: 50,
  timeWindow: "1 minute",
});

app.register(cors, {
  origin: true,
  credentials: true,
});

// Route discovery runs after all plugins — the auto-loader requires the fully configured Fastify instance
await loadRoutes(app);

// app.ready() is intentionally skipped — all plugin registrations are awaited above, making the instance ready synchronously
app.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    logger.error("Error starting server", { err });
    process.exit(1);
  }

  logger.info(`Server running on port ${port}`);
});
