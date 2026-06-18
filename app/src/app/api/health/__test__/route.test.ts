import { describe, it, expect } from "vitest";
import { GET } from "../route";

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const request = new Request("http://localhost/api/health", {
      method: "GET",
    });

    const res = await GET(request);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
  });
});
