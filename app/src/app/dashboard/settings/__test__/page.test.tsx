import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "../page";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
  ApiError: class extends Error {
    statusCode: number;
    constructor(msg: string) {
      super(msg);
      this.statusCode = 400;
    }
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => "/dashboard/settings",
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
    dashboard: { path: "/dashboard", children: { settings: "settings" } },
  },
}));

const mockUser = { id: "1", email: "test@test.com", username: "testuser", isMFAEnabled: false };

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(<SettingsPage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders profile form with data", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me") return Promise.resolve({ success: true, user: mockUser });
      if (url === "/auth/mfa/status") return Promise.resolve({ success: true, enabled: false });
      return Promise.resolve({});
    });

    render(<SettingsPage />);

    await screen.findByRole("heading", { name: "Settings", level: 1 });
    expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test@test.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("renders password form", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me") return Promise.resolve({ success: true, user: mockUser });
      if (url === "/auth/mfa/status") return Promise.resolve({ success: true, enabled: false });
      return Promise.resolve({});
    });

    render(<SettingsPage />);

    await screen.findByText("Change Password");
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBe(3);
    expect(screen.getByRole("button", { name: /change password/i })).toBeInTheDocument();
  });

  it("renders MFA section", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me") return Promise.resolve({ success: true, user: mockUser });
      if (url === "/auth/mfa/status") return Promise.resolve({ success: true, enabled: false });
      return Promise.resolve({});
    });

    render(<SettingsPage />);

    await screen.findByText("Two-Factor Authentication");
    expect(screen.getByRole("button", { name: /setup mfa/i })).toBeInTheDocument();
    expect(screen.getByText(/add an extra layer of security/i)).toBeInTheDocument();
  });
});
