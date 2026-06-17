export const ROUTES = {
  landing: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password/:token",
  dashboard: {
    path: "/dashboard",
    children: {
      projects: "projects",
      secrets: "projects/:projectId/secrets",
      apiKeys: "api-keys",
      apiDocs: "api-docs",
      webhooks: "webhooks",
      settings: "settings",
    },
  },
};
