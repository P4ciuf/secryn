import { ENV } from "./config/env.js";
import { app } from "./app.js";
import { logger } from "./utils/logger.js";

const port = Number(ENV.port ?? 3000);

app.listen({ port }, () => {
  logger.info(`Server running on port ${port}`);
});
