import { createBrowserRouter } from "react-router";
import Landing from "./pages/Landing";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import ForgotPasswordPage from "./features/auth/ForgotPasswordPage";
import ResetPasswordPage from "./features/auth/ResetPasswordPage";
import DashboardLayout from "./layouts/DashboardLayout";
import ProjectsPage from "./features/projects/ProjectsPage";
import SecretsPage from "./features/projects/SecretsPage";
import ApiKeysPage from "./features/api-keys/ApiKeysPage";
import ApiDocsPage from "./features/api-docs/ApiDocsPage";
import WebhooksPage from "./features/webhooks/WebhooksPage";
import SettingsPage from "./features/settings/SettingsPage";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";

/** Application route definitions for public and authenticated sections. */
export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
    ErrorBoundary,
  },
  {
    path: "/login",
    Component: LoginPage,
    ErrorBoundary,
  },
  {
    path: "/register",
    Component: RegisterPage,
    ErrorBoundary,
  },
  {
    path: "/forgot-password",
    Component: ForgotPasswordPage,
    ErrorBoundary,
  },
  {
    path: "/reset-password/:token",
    Component: ResetPasswordPage,
    ErrorBoundary,
  },
  {
    path: "/dashboard",
    Component: DashboardLayout,
    ErrorBoundary,
    children: [
      {
        path: "projects",
        Component: ProjectsPage,
        ErrorBoundary,
      },
      {
        path: "projects/:projectId/secrets",
        Component: SecretsPage,
        ErrorBoundary,
      },
      {
        path: "api-keys",
        Component: ApiKeysPage,
        ErrorBoundary,
      },
      {
        path: "api-docs",
        Component: ApiDocsPage,
        ErrorBoundary,
      },
      {
        path: "webhooks",
        Component: WebhooksPage,
        ErrorBoundary,
      },
      {
        path: "settings",
        Component: SettingsPage,
        ErrorBoundary,
      },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
