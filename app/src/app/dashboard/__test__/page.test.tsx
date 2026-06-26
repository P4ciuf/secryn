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

  it("renders empty counts when there is no data", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me")
        return Promise.resolve({ success: true, user: { email: "t@t.com", username: "Bob" } });
      if (url === "/projects") return Promise.resolve({ success: true, projects: [] });
      if (url === "/api-keys") return Promise.resolve({ success: true, apiKeys: [] });
      return Promise.resolve({});
    });

    render(<DashboardPage />);

    await screen.findByText("Welcome, Bob");
    expect(screen.getAllByText("0").length).toBe(2);
  });

  it("renders the Secured card", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me")
        return Promise.resolve({ success: true, user: { email: "t@t.com", username: "Bob" } });
      if (url === "/projects") return Promise.resolve({ success: true, projects: [] });
      if (url === "/api-keys") return Promise.resolve({ success: true, apiKeys: [] });
      return Promise.resolve({});
    });

    render(<DashboardPage />);

    await screen.findByText("Welcome, Bob");
    expect(screen.getByText("Secured")).toBeInTheDocument();
  });

  it("renders recent projects section when projects exist", async () => {
    const projects = [
      { id: "p1", name: "Project One", slug: "project-one" },
      { id: "p2", name: "Project Two", slug: "project-two" },
    ];
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me")
        return Promise.resolve({ success: true, user: { email: "t@t.com", username: "Carl" } });
      if (url === "/projects") return Promise.resolve({ success: true, projects });
      if (url === "/api-keys") return Promise.resolve({ success: true, apiKeys: [] });
      return Promise.resolve({});
    });

    render(<DashboardPage />);

    await screen.findByText("Recent Projects");
    expect(screen.getByText("Project One")).toBeInTheDocument();
    expect(screen.getByText("Project Two")).toBeInTheDocument();
    expect(screen.getByText("project-one")).toBeInTheDocument();
    expect(screen.getByText("View all")).toBeInTheDocument();
  });

  it("does not render recent projects section when no projects exist", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me")
        return Promise.resolve({ success: true, user: { email: "t@t.com", username: "Dan" } });
      if (url === "/projects") return Promise.resolve({ success: true, projects: [] });
      if (url === "/api-keys") return Promise.resolve({ success: true, apiKeys: [] });
      return Promise.resolve({});
    });

    render(<DashboardPage />);

    await screen.findByText("Welcome, Dan");
    expect(screen.queryByText("Recent Projects")).not.toBeInTheDocument();
  });

  it("renders links with correct hrefs", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/users/me")
        return Promise.resolve({ success: true, user: { email: "t@t.com", username: "Eve" } });
      if (url === "/projects")
        return Promise.resolve({
          success: true,
          projects: [{ id: "p1", name: "P1", slug: "p1-slug" }],
        });
      if (url === "/api-keys") return Promise.resolve({ success: true, apiKeys: [] });
      return Promise.resolve({});
    });

    render(<DashboardPage />);

    await screen.findByText("Projects");

    const projectsLink = screen.getByText("Projects").closest("a");
    expect(projectsLink).toHaveAttribute("href", "/dashboard/projects");

    const apiKeysLink = screen.getByText("API Keys").closest("a");
    expect(apiKeysLink).toHaveAttribute("href", "/dashboard/api-keys");
  });
});
