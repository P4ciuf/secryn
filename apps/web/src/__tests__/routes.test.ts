import { describe, it, expect } from "vitest";
import { router } from "@/routes";

describe("Router configuration", () => {
  it("should define the root Landing route", () => {
    const rootRoute = router.routes[0];
    expect(rootRoute).toBeDefined();
    expect(rootRoute.path).toBe("/");
    expect(rootRoute).toHaveProperty("ErrorBoundary");
  });

  it("should define the /login route with ErrorBoundary", () => {
    const loginRoute = router.routes[1];
    expect(loginRoute?.path).toBe("/login");
    expect(loginRoute).toHaveProperty("ErrorBoundary");
  });

  it("should define the /register route with ErrorBoundary", () => {
    const registerRoute = router.routes[2];
    expect(registerRoute?.path).toBe("/register");
    expect(registerRoute).toHaveProperty("ErrorBoundary");
  });

  it("should define the /dashboard parent route with ErrorBoundary", () => {
    const dashboardRoute = router.routes[5];
    expect(dashboardRoute?.path).toBe("/dashboard");
    expect(dashboardRoute).toHaveProperty("ErrorBoundary");
    expect(dashboardRoute?.children).toBeDefined();
  });

  it("should define 6 child routes under /dashboard", () => {
    const dashboardRoute = router.routes[5];
    expect(dashboardRoute?.children).toHaveLength(6);
  });

  it("should define /dashboard/projects child route with ErrorBoundary", () => {
    const dashboardRoute = router.routes[5];
    const projectsRoute = dashboardRoute?.children?.find((r) => r.path === "projects");
    expect(projectsRoute).toBeDefined();
    expect(projectsRoute).toHaveProperty("ErrorBoundary");
  });

  it("should define /dashboard/projects/:projectId/secrets child route with ErrorBoundary", () => {
    const dashboardRoute = router.routes[5];
    const secretsRoute = dashboardRoute?.children?.find(
      (r) => r.path === "projects/:projectId/secrets",
    );
    expect(secretsRoute).toBeDefined();
    expect(secretsRoute).toHaveProperty("ErrorBoundary");
  });

  it("should define /dashboard/api-keys child route with ErrorBoundary", () => {
    const dashboardRoute = router.routes[5];
    const apiKeysRoute = dashboardRoute?.children?.find((r) => r.path === "api-keys");
    expect(apiKeysRoute).toBeDefined();
    expect(apiKeysRoute).toHaveProperty("ErrorBoundary");
  });

  it("should define /dashboard/api-docs child route with ErrorBoundary", () => {
    const dashboardRoute = router.routes[5];
    const apiDocsRoute = dashboardRoute?.children?.find((r) => r.path === "api-docs");
    expect(apiDocsRoute).toBeDefined();
    expect(apiDocsRoute).toHaveProperty("ErrorBoundary");
  });

  it("should define /dashboard/webhooks child route with ErrorBoundary", () => {
    const dashboardRoute = router.routes[5];
    const webhooksRoute = dashboardRoute?.children?.find((r) => r.path === "webhooks");
    expect(webhooksRoute).toBeDefined();
    expect(webhooksRoute).toHaveProperty("ErrorBoundary");
  });

  it("should define /dashboard/settings child route with ErrorBoundary", () => {
    const dashboardRoute = router.routes[5];
    const settingsRoute = dashboardRoute?.children?.find((r) => r.path === "settings");
    expect(settingsRoute).toBeDefined();
    expect(settingsRoute).toHaveProperty("ErrorBoundary");
  });

  it("should define the * catch-all NotFound route without ErrorBoundary", () => {
    const notFoundRoute = router.routes[6];
    expect(notFoundRoute?.path).toBe("*");
    expect(notFoundRoute).not.toHaveProperty("ErrorBoundary");
  });
});
