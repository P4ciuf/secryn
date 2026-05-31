import fastify from "fastify";

export const app = fastify();

app.get("/health", async () => {
  return { status: "ok" };
});
