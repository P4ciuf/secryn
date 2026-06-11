/** Centralized route path constants for navigation. */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password/:token",
  DASHBOARD: "/dashboard",
  PROJECTS: "/dashboard/projects",
  SECRETS: (projectId = ":projectId") => `/dashboard/projects/${projectId}/secrets`,
  API_KEYS: "/dashboard/api-keys",
  API_DOCS: "/dashboard/api-docs",
  WEBHOOKS: "/dashboard/webhooks",
  SETTINGS: "/dashboard/settings",
} as const;
