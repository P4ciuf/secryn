import { fastifyApp } from "./lib/fastify.js";
import { EnvUtils } from "./utils/env.js";
import { logger } from "./utils/logger.js";

// Fail-fast: validate every required env var before importing routes or connecting to the database
try {
  EnvUtils.checkEnv();
} catch (error) {
  logger.error("Critical environment variables are missing, aborting.", { error });
  process.exit(1);
}

const ENV = EnvUtils.envVariables();
const port = Number(ENV.port);
const app = fastifyApp;

// Ready the plugins (Swagger, etc.) before binding the listen socket
await app.ready();

app.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    logger.error("Error starting server", { err });
    process.exit(1);
  }
  logger.info(`Server running on port ${port}`);
});
