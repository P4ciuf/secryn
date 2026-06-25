import { describe, it, expect, vi } from "vitest";

const { mockGetHandler, mockPostHandler } = vi.hoisted(() => ({
  mockGetHandler: vi.fn(),
  mockPostHandler: vi.fn(),
}));

vi.mock("@/auth", () => ({
  handlers: {
    GET: mockGetHandler,
    POST: mockPostHandler,
  },
}));

import { GET, POST } from "../route";

describe("[...nextauth]", () => {
  it("exports GET and POST as functions", () => {
    expect(typeof GET).toBe("function");
    expect(typeof POST).toBe("function");
  });

  it("delegates GET to the NextAuth handler", async () => {
    mockGetHandler.mockResolvedValue(new Response(null, { status: 200 }));
    const request = new Request("http://localhost/api/auth/csrf", { method: "GET" });
    const response = await GET(request as unknown as Parameters<typeof GET>[0]);

    expect(mockGetHandler).toHaveBeenCalledTimes(1);
    expect(mockGetHandler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });

  it("delegates POST to the NextAuth handler", async () => {
    mockPostHandler.mockResolvedValue(new Response(null, { status: 200 }));
    const request = new Request("http://localhost/api/auth/callback/credentials", {
      method: "POST",
      body: JSON.stringify({ email: "u@t.com", password: "p" }),
    });
    const response = await POST(request);

    expect(mockPostHandler).toHaveBeenCalledTimes(1);
    expect(mockPostHandler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });

  it("returns the error status from the underlying handler", async () => {
    mockGetHandler.mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    );
    const request = new Request("http://localhost/api/auth/session", { method: "GET" });
    const response = await GET(request as unknown as Parameters<typeof GET>[0]);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });
});
