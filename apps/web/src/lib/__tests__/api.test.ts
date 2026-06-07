import { describe, it, expect, vi, beforeEach } from "vitest";

globalThis.fetch = vi.fn();

const localStorageGetItemSpy = vi.spyOn(Storage.prototype, "getItem");

import { api, ApiError } from "../api";

describe("api", () => {
  beforeEach(() => {
    vi.mocked(globalThis.fetch).mockReset();
    localStorageGetItemSpy.mockReset();
  });

  describe("get", () => {
    it("sends GET request to correct default URL", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await api.get("/test");

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/api/v1/test",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("appends query params to the URL", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await api.get("/test", { params: { foo: "bar", baz: "qux" } });

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/api/v1/test?foo=bar&baz=qux",
        expect.anything(),
      );
    });

    it("handles empty params", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await api.get("/test", { params: {} });

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith("/api/v1/test?", expect.anything());
    });
  });

  describe("post", () => {
    it("sends POST request with JSON body", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));
      const body = { name: "test" };

      await api.post("/test", body);

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/api/v1/test",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    });

    it("sends POST request with undefined body", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await api.post("/test");

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/api/v1/test",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("put", () => {
    it("sends PUT request with JSON body", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));
      const body = { name: "test" };

      await api.put("/test", body);

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/api/v1/test",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(body),
        }),
      );
    });
  });

  describe("patch", () => {
    it("sends PATCH request with correct method", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await api.patch("/test", { name: "test" });

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/api/v1/test",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  describe("delete", () => {
    it("sends DELETE request with correct method", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await api.delete("/test");

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/api/v1/test",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("authentication", () => {
    it("does not inject Authorization header (cookie-only auth)", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));
      localStorageGetItemSpy.mockReturnValue("my-token");

      await api.get("/test");

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/api/v1/test",
        expect.objectContaining({
          headers: {},
        }),
      );
    });

    it("does not inject Authorization header when token is absent", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));
      localStorageGetItemSpy.mockReturnValue(null);

      await api.get("/test");

      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe("credentials", () => {
    it("sets credentials to 'include' on every request", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await api.get("/test");

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/api/v1/test",
        expect.objectContaining({ credentials: "include" }),
      );
    });
  });

  describe("error handling", () => {
    it("throws ApiError with status, message, and data on non-2xx response", async () => {
      const errorData = { error: "Not found" };
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify(errorData), {
          status: 404,
          statusText: "Not Found",
        }),
      );

      try {
        await api.get("/test");
        expect.unreachable("Expected api.get to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
          status: 404,
          message: "Not Found",
          data: errorData,
        });
      }
    });

    it("throws ApiError with null data when response body is not valid JSON", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("plain text error", {
          status: 500,
          statusText: "Internal Server Error",
        }),
      );

      await expect(api.get("/test")).rejects.toMatchObject({
        status: 500,
        message: "Internal Server Error",
        data: null,
      });
    });
  });

  describe("204 handling", () => {
    it("returns undefined for 204 No Content response without parsing JSON", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      const result = await api.get("/test");

      expect(result).toBeUndefined();
    });
  });

  describe("JSON responses", () => {
    it("returns parsed JSON for 200 response", async () => {
      const data = { id: 1, name: "test" };
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify(data), { status: 200 }),
      );

      const result = await api.get("/test");

      expect(result).toEqual(data);
    });
  });

  describe("custom base URL", () => {
    it("uses VITE_API_BASE_URL environment variable when set", async () => {
      vi.stubEnv("VITE_API_BASE_URL", "/custom/v1");
      vi.resetModules();

      const { api: customApi } = await import("../api");

      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await customApi.get("/test");

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/custom/v1/test",
        expect.anything(),
      );

      vi.unstubAllEnvs();
      vi.resetModules();
    });
  });

  describe("Content-Type header", () => {
    it("does not set Content-Type for requests without a body", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await api.get("/test");

      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
    });

    it("does not set Content-Type for POST requests without a body", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await api.post("/test");

      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
    });

    it("sets Content-Type to application/json for requests with a body", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await api.post("/test", { name: "test" });

      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("custom headers", () => {
    it("merges custom headers with defaults", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(new Response(null, { status: 204 }));

      await api.get("/test", {
        headers: { "X-Custom": "custom-value" },
      });

      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/api/v1/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Custom": "custom-value",
          }),
        }),
      );
    });
  });
});

describe("token refresh", () => {
  it("should retry the original request after successful token refresh", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "UNAUTHORIZED" }), { status: 401 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "success" }), { status: 200 }));

    const result = await api.get("/protected-resource");

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const refreshCall = calls.find((c) => (c[0] as string).includes("/auth/refresh"));
    expect(refreshCall).toBeDefined();
    if (refreshCall) {
      expect((refreshCall[1] as RequestInit).method).toBe("POST");
    }
    expect(result).toEqual({ data: "success" });
  });
});

describe("ApiError", () => {
  it("constructs correctly with status, message, and data", () => {
    const error = new ApiError(400, "Bad Request", { field: "email" });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe("ApiError");
    expect(error.status).toBe(400);
    expect(error.message).toBe("Bad Request");
    expect(error.data).toEqual({ field: "email" });
  });

  it("constructs correctly without data", () => {
    const error = new ApiError(500, "Server Error");

    expect(error.status).toBe(500);
    expect(error.message).toBe("Server Error");
    expect(error.data).toBeUndefined();
  });
});
