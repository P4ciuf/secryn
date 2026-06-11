import { describe, it, expect } from "vitest";
import { mockApiKeys } from "@/data/api-keys";
import type { ApiKey, ApiKeyPermission } from "@repo/shared";

describe("mockApiKeys", () => {
  it("should be an array of ApiKey objects", () => {
    expect(Array.isArray(mockApiKeys)).toBe(true);
    expect(mockApiKeys.length).toBeGreaterThan(0);
  });

  it("should have required fields on every API key", () => {
    for (const apiKey of mockApiKeys) {
      expect(apiKey).toHaveProperty("id");
      expect(typeof apiKey.id).toBe("string");
      expect(apiKey).toHaveProperty("keyName");
      expect(typeof apiKey.keyName).toBe("string");
      expect(apiKey).toHaveProperty("key");
      expect(typeof apiKey.key).toBe("string");
      expect(apiKey.key).toMatch(/^sc_/);
      expect(apiKey).toHaveProperty("userId");
      expect(typeof apiKey.userId).toBe("string");
      expect(apiKey).toHaveProperty("isActive");
      expect(typeof apiKey.isActive).toBe("boolean");
      expect(apiKey).toHaveProperty("createdAt");
      expect(typeof apiKey.createdAt).toBe("string");
      expect(apiKey).toHaveProperty("updatedAt");
      expect(typeof apiKey.updatedAt).toBe("string");
      expect(apiKey).toHaveProperty("expiresAt");
      expect(typeof apiKey.expiresAt).toBe("string");
      expect(apiKey).toHaveProperty("permissions");
      expect(Array.isArray(apiKey.permissions)).toBe(true);
      expect(apiKey.permissions.length).toBeGreaterThan(0);
    }
  });

  it("should have valid permissions on every API key", () => {
    const validPermissions: ApiKeyPermission[] = ["read", "write"];
    for (const apiKey of mockApiKeys) {
      for (const permission of apiKey.permissions) {
        expect(validPermissions).toContain(permission);
      }
    }
  });

  it("should have unique IDs", () => {
    const ids = mockApiKeys.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have unique key values", () => {
    const keys = mockApiKeys.map((k) => k.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("should use the ApiKey type from @repo/shared", () => {
    const typed: ApiKey[] = mockApiKeys;
    expect(typed).toBe(mockApiKeys);
  });
});
