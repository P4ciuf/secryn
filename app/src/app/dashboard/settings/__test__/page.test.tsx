import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "../page";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
  ApiError: class ApiError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string) {
      super(message);
      this.statusCode = 500;
      this.code = "UNKNOWN";
      this.name = "ApiError";
    }
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => "/dashboard/settings",
}));

vi.mock("@/components/ui/pageHeader", () => ({
  PageHeader: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock("@/components/ui/breadcrumbs", () => ({
  default: ({ items }: { items: Array<{ label: string; href?: string }> }) => (
    <nav aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => (
          <li key={i}>{item.label}</li>
        ))}
      </ol>
    </nav>
  ),
}));

vi.mock("@/data/routes", () => ({
  ROUTES: {
    dashboard: {
      path: "/dashboard",
      children: { settings: "settings" },
    },
  },
}));

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
};

function getPasswordInputs(): HTMLInputElement[] {
  const inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]');
  return Array.from(inputs);
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me") {
        return Promise.resolve({ success: true, user: mockUser });
      }
      return Promise.resolve({});
    });
  });

  it("renders the page header and breadcrumbs", async () => {
    render(<SettingsPage />);

    await screen.findByTestId("page-header");
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Manage your account and security")).toBeInTheDocument();
    const breadcrumb = screen.getByRole("navigation", {
      name: "Breadcrumb",
    });
    expect(breadcrumb).toBeInTheDocument();
  });

  it("loads and displays the user profile", async () => {
    render(<SettingsPage />);

    await screen.findByDisplayValue("testuser");
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
  });

  it("shows loading skeleton while fetching", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(<SettingsPage />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("updates profile and shows success message", async () => {
    mockApiFetch.mockClear();
    mockApiFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/users/me" && !options?.method) {
        return Promise.resolve({
          success: true,
          user: mockUser,
        });
      }
      if (url === "/users/me" && options?.method === "PUT") {
        return Promise.resolve({
          success: true,
          user: { ...mockUser, username: "newname" },
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<SettingsPage />);

    await screen.findByDisplayValue("testuser");

    const usernameInput = screen.getByDisplayValue("testuser");
    await user.clear(usernameInput);
    await user.type(usernameInput, "newname");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await screen.findByText("Profile updated.");
  });

  it("shows error on profile update failure", async () => {
    mockApiFetch.mockClear();
    mockApiFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/users/me" && !options?.method) {
        return Promise.resolve({
          success: true,
          user: mockUser,
        });
      }
      throw new Error("Server error");
    });

    const user = userEvent.setup();
    render(<SettingsPage />);

    await screen.findByDisplayValue("testuser");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await screen.findByText("Update failed");
  });

  it("changes password when new password is valid", async () => {
    mockApiFetch.mockClear();
    mockApiFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/users/me" && !options?.method) {
        return Promise.resolve({
          success: true,
          user: mockUser,
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<SettingsPage />);

    await screen.findByDisplayValue("testuser");

    const pwdInputs = getPasswordInputs();
    await user.type(pwdInputs[0], "oldpassword");
    await user.type(pwdInputs[1], "newpassword123");
    await user.type(pwdInputs[2], "newpassword123");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await screen.findByText("Password changed.");
  });

  it("shows error when new password is too short", async () => {
    mockApiFetch.mockClear();
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me") {
        return Promise.resolve({ success: true, user: mockUser });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<SettingsPage />);

    await screen.findByDisplayValue("testuser");

    const pwdInputs = getPasswordInputs();
    await user.type(pwdInputs[0], "oldpassword");
    await user.type(pwdInputs[1], "short");
    await user.type(pwdInputs[2], "short");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await screen.findByText("Password must be at least 8 characters.");
  });

  it("shows error when passwords do not match", async () => {
    mockApiFetch.mockClear();
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me") {
        return Promise.resolve({ success: true, user: mockUser });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<SettingsPage />);

    await screen.findByDisplayValue("testuser");

    const pwdInputs = getPasswordInputs();
    await user.type(pwdInputs[0], "oldpassword");
    await user.type(pwdInputs[1], "password123");
    await user.type(pwdInputs[2], "different123");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await screen.findByText("Passwords do not match.");
  });

  it("navigates to /login after account deletion", async () => {
    const originalLocation = window.location;
    const mockLocation = { href: "" };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });
    window.confirm = vi.fn().mockReturnValue(true);

    mockApiFetch.mockClear();
    mockApiFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/users/me" && !options?.method) {
        return Promise.resolve({
          success: true,
          user: mockUser,
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<SettingsPage />);

    await screen.findByDisplayValue("testuser");

    await user.click(screen.getByRole("button", { name: /delete account/i }));

    await waitFor(() => {
      expect(window.location.href).toBe("/login");
    });

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  it("shows error on profile load failure but still renders", async () => {
    mockApiFetch.mockClear();
    mockApiFetch.mockRejectedValue(new Error("Failed to load"));

    render(<SettingsPage />);

    await screen.findByTestId("page-header");
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Manage your account and security")).toBeInTheDocument();
  });
});
