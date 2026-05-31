import { describe, it, expect } from "vitest";
import { app } from "../app.js";

describe("API /health", () => {
  it("GET /health returns 200 with status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("GET /health has correct content-type", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.headers["content-type"]).toContain("application/json");
  });

  it("GET /unknown returns 404", async () => {
    const res = await app.inject({ method: "GET", url: "/not-found" });

    expect(res.statusCode).toBe(404);
  });
});
