import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import route from "../health.route.js";

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.route(route);
  return app;
}

describe("GET /health", () => {
  it("should return 200 with status ok", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("should return 200 with application/json content-type", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.headers["content-type"]).toContain("application/json");
  });

  it("should return 404 for unknown routes", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/not-found" });

    expect(res.statusCode).toBe(404);
  });
});
