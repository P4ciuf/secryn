import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "../page";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
  usePathname: vi.fn(),
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
    dashboard: { path: "/dashboard", children: { projects: "projects", apiKeys: "api-keys" } },
  },
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);
  });

  it("renders 'Welcome {username}' and data counts", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me")
        return Promise.resolve({ success: true, user: { email: "t@t.com", username: "Alice" } });
      if (url === "/projects")
        return Promise.resolve({ success: true, projects: [{ id: "1", name: "P1", slug: "p1" }] });
      if (url === "/api-keys")
        return Promise.resolve({
          success: true,
          apiKeys: [
            { id: "k1", keyName: "Key1" },
            { id: "k2", keyName: "Key2" },
          ],
        });
      return Promise.resolve({});
    });

    render(<DashboardPage />);

    await screen.findByText("Welcome, Alice");
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
