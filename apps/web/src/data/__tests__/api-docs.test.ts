import { describe, it, expect } from "vitest";
import { codeExamples, endpoints } from "@/data/api-docs";
import type { CodeLanguage, ApiEndpoint } from "@/types/api-docs";

describe("codeExamples", () => {
  it("should be an object with entries for every CodeLanguage", () => {
    expect(typeof codeExamples).toBe("object");
    expect(codeExamples).not.toBeNull();
  });

  it("should have a string value for each language", () => {
    const languages: CodeLanguage[] = ["curl", "node", "python"];
    for (const lang of languages) {
      expect(codeExamples).toHaveProperty(lang);
      expect(typeof codeExamples[lang]).toBe("string");
      expect(codeExamples[lang].length).toBeGreaterThan(0);
    }
  });

  it("should not have extra keys beyond the defined CodeLanguage values", () => {
    const validKeys: CodeLanguage[] = ["curl", "node", "python"];
    const keys = Object.keys(codeExamples);
    for (const key of keys) {
      expect(validKeys).toContain(key as CodeLanguage);
    }
  });

  it("should use the CodeLanguage type from @/types", () => {
    const typed: Record<CodeLanguage, string> = codeExamples;
    expect(typed).toBe(codeExamples);
  });
});

describe("endpoints", () => {
  it("should be a non-empty array of ApiEndpoint objects", () => {
    expect(Array.isArray(endpoints)).toBe(true);
    expect(endpoints.length).toBeGreaterThan(0);
  });

  it("should have required fields on every endpoint", () => {
    const validMethods = ["GET", "POST", "PUT", "DELETE"];
    for (const endpoint of endpoints) {
      expect(endpoint).toHaveProperty("method");
      expect(validMethods).toContain(endpoint.method);
      expect(endpoint).toHaveProperty("path");
      expect(typeof endpoint.path).toBe("string");
      expect(endpoint).toHaveProperty("description");
      expect(typeof endpoint.description).toBe("string");
      expect(endpoint).toHaveProperty("color");
      expect(typeof endpoint.color).toBe("string");
      expect(endpoint.color).toMatch(/^bg-/);
    }
  });

  it("should have non-empty paths starting with /v1/", () => {
    for (const endpoint of endpoints) {
      expect(endpoint.path).toMatch(/^\/v1\//);
    }
  });

  it("should have unique path+method combinations", () => {
    // Each endpoint path+method should be unique
    const keys = endpoints.map((e) => `${e.method} ${e.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("should use the ApiEndpoint type from @/types", () => {
    const typed: ApiEndpoint[] = endpoints;
    expect(typed).toBe(endpoints);
  });
});
