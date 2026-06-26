import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardLayout from "../layout";

const { mockApiFetch, mockLogoutAction, mockResendVerificationEmailAction } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
  mockLogoutAction: vi.fn(),
  mockResendVerificationEmailAction: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
}));

vi.mock("@/app/(auth)/actions", () => ({
  logoutAction: mockLogoutAction,
  resendVerificationEmailAction: mockResendVerificationEmailAction,
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => "/dashboard",
  useParams: () => ({}),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/data/routes", () => ({
  ROUTES: {
    landing: "/",
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
  },
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the sidebar with all navigation items", async () => {
    mockApiFetch.mockRejectedValue(new Error("Not authenticated"));

    render(<DashboardLayout>content</DashboardLayout>);

    expect(screen.getAllByText("Secryn")[0]).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("API Keys")).toBeInTheDocument();
    expect(screen.getByText("API Docs")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("displays loading state for user email initially", () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}));

    render(<DashboardLayout>content</DashboardLayout>);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("fetches user email on mount and displays it", async () => {
    mockApiFetch.mockResolvedValue({
      user: { email: "user@test.com", username: "test", isVerified: true },
    });

    render(<DashboardLayout>content</DashboardLayout>);

    await waitFor(() => {
      expect(screen.getByText("user@test.com")).toBeInTheDocument();
    });
  });

  it("does not show the unverified banner when user is verified", async () => {
    mockApiFetch.mockResolvedValue({
      user: { email: "user@test.com", username: "test", isVerified: true },
    });

    render(<DashboardLayout>content</DashboardLayout>);

    await waitFor(() => {
      expect(screen.getByText("user@test.com")).toBeInTheDocument();
    });

    expect(screen.queryByText("Get verified!")).not.toBeInTheDocument();
  });

  it("shows the unverified banner when user is not verified", async () => {
    mockApiFetch.mockResolvedValue({
      user: { email: "user@test.com", username: "test", isVerified: false },
    });

    render(<DashboardLayout>content</DashboardLayout>);

    await waitFor(() => {
      expect(screen.getByText("Get verified!")).toBeInTheDocument();
    });

    expect(screen.getByText(/your account will be deleted within 72 hours/i)).toBeInTheDocument();
    expect(screen.getByText("Resend verification email")).toBeInTheDocument();
  });

  it("calls logoutAction and navigates to landing on sign out", async () => {
    mockApiFetch.mockRejectedValue(new Error("Not authenticated"));
    mockLogoutAction.mockResolvedValue({ success: true });

    render(<DashboardLayout>content</DashboardLayout>);

    fireEvent.click(screen.getByText("Sign out"));

    await waitFor(() => {
      expect(mockLogoutAction).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("highlights the active navigation item", async () => {
    mockApiFetch.mockRejectedValue(new Error("Not authenticated"));

    render(<DashboardLayout>content</DashboardLayout>);

    const overviewLink = screen.getByText("Overview").closest("a");
    expect(overviewLink?.className).toContain("bg-blue-600/20");
    expect(overviewLink?.className).toContain("text-blue-400");
  });

  it("toggles the mobile sidebar when the menu button is clicked", async () => {
    mockApiFetch.mockRejectedValue(new Error("Not authenticated"));

    render(<DashboardLayout>content</DashboardLayout>);

    const menuButton = document.querySelector("header button");
    expect(menuButton).toBeInTheDocument();

    fireEvent.click(menuButton!);

    await waitFor(() => {
      const overlay = document.querySelector(".fixed.inset-0.bg-black\\/50");
      expect(overlay).toBeInTheDocument();
    });

    fireEvent.click(document.querySelector(".fixed.inset-0.bg-black\\/50")!);

    await waitFor(() => {
      expect(document.querySelector(".fixed.inset-0.bg-black\\/50")).not.toBeInTheDocument();
    });
  });

  it("calls resendVerificationEmailAction when the resend button is clicked", async () => {
    mockApiFetch.mockResolvedValue({
      user: { email: "user@test.com", username: "test", isVerified: false },
    });
    mockResendVerificationEmailAction.mockResolvedValue({ success: true });

    render(<DashboardLayout>content</DashboardLayout>);

    await waitFor(() => {
      expect(screen.getByText("Resend verification email")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Resend verification email"));

    expect(mockResendVerificationEmailAction).toHaveBeenCalled();
  });

  it("handles user fetch error gracefully", async () => {
    mockApiFetch.mockRejectedValue(new Error("Not authenticated"));

    render(<DashboardLayout>content</DashboardLayout>);

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });
});
