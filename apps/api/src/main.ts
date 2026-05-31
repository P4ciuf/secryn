import { ENV } from "./config/env.js";
import { app } from "./app.js";

const port = Number(ENV.port ?? 3000);

app.listen({ port }, () => {
  console.log(`Server running on port ${port}`);
});
