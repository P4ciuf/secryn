import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SecretsPage from "../page";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
  apiFetchText: vi.fn().mockResolvedValue("KEY=value"),
  ApiError: class extends Error {
    statusCode: number;
    constructor(msg: string) {
      super(msg);
      this.statusCode = 400;
    }
  },
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useParams: () => ({ projectId: "proj-1" }),
  usePathname: () => "/dashboard/projects/proj-1/secrets",
}));

vi.mock("@/data/routes", () => ({
  ROUTES: {
    dashboard: { path: "/dashboard", children: { projects: "projects" } },
  },
}));

const mockSecrets = [
  { id: "s1", name: "DATABASE_URL", value: "postgres://localhost", notes: "Main database", projectId: "proj-1", createdAt: "2025-01-01", updatedAt: "2025-01-01" },
  { id: "s2", name: "API_KEY", value: "secret-key-123", notes: "", projectId: "proj-1", createdAt: "2025-01-01", updatedAt: "2025-01-01" },
];

const mockProject = { id: "proj-1", name: "My Project" };

describe("SecretsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(<SecretsPage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);
  });

  it("renders secrets list", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/projects/proj-1") return Promise.resolve({ success: true, project: mockProject });
      if (url === "/projects/proj-1/secrets") return Promise.resolve({ success: true, secrets: mockSecrets });
      return Promise.resolve({});
    });

    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");
    expect(screen.getByText("API_KEY")).toBeInTheDocument();
    expect(screen.getByText("Main database")).toBeInTheDocument();
  });

  it("shows create modal", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/projects/proj-1") return Promise.resolve({ success: true, project: mockProject });
      if (url === "/projects/proj-1/secrets") return Promise.resolve({ success: true, secrets: mockSecrets });
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");
    await user.click(screen.getByRole("button", { name: /add secret/i }));

    expect(screen.getByRole("heading", { name: "Add Secret" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("DATABASE_URL")).toBeInTheDocument();
  });

  it("shows edit modal", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/projects/proj-1") return Promise.resolve({ success: true, project: mockProject });
      if (url === "/projects/proj-1/secrets") return Promise.resolve({ success: true, secrets: mockSecrets });
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");
    await user.click(screen.getByText("DATABASE_URL"));

    expect(screen.getByRole("heading", { name: "Edit Secret" })).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/projects/proj-1") return Promise.resolve({ success: true, project: mockProject });
      if (url === "/projects/proj-1/secrets") return Promise.resolve({ success: true, secrets: [] });
      return Promise.resolve({});
    });

    render(<SecretsPage />);

    await screen.findByText("No secrets yet");
    expect(screen.getByText(/add your first secret/i)).toBeInTheDocument();
  });
});
