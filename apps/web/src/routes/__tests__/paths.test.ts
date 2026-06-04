import { describe, it, expect } from "vitest";
import { ROUTES } from "../paths";

describe("ROUTES", () => {
  it("defines all route paths as non-empty values", () => {
    expect(ROUTES.HOME).toBe("/");
    expect(ROUTES.LOGIN).toBe("/login");
    expect(ROUTES.REGISTER).toBe("/register");
    expect(ROUTES.DASHBOARD).toBe("/dashboard");
    expect(ROUTES.PROJECTS).toBe("/dashboard/projects");
    expect(ROUTES.API_KEYS).toBe("/dashboard/api-keys");
    expect(ROUTES.API_DOCS).toBe("/dashboard/api-docs");
    expect(ROUTES.WEBHOOKS).toBe("/dashboard/webhooks");
    expect(ROUTES.SETTINGS).toBe("/dashboard/settings");
  });

  describe("SECRETS", () => {
    it("generates correct path with provided projectId", () => {
      expect(ROUTES.SECRETS("my-project")).toBe("/dashboard/projects/my-project/secrets");
    });

    it("generates correct path with numeric projectId", () => {
      expect(ROUTES.SECRETS("42")).toBe("/dashboard/projects/42/secrets");
    });

    it("generates correct path with UUID projectId", () => {
      expect(ROUTES.SECRETS("abc-123-def")).toBe("/dashboard/projects/abc-123-def/secrets");
    });

    it("uses default placeholder when no argument is provided", () => {
      expect(ROUTES.SECRETS()).toBe("/dashboard/projects/:projectId/secrets");
    });
  });

  it("matches snapshot", () => {
    expect(ROUTES).toMatchSnapshot();
  });
});
