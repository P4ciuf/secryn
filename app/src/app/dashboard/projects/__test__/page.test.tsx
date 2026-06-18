import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectsPage from "../page";

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
  usePathname: () => "/dashboard/projects",
}));

vi.mock("@/data/routes", () => ({
  ROUTES: {
    dashboard: { path: "/dashboard", children: { projects: "projects" } },
  },
}));

const mockProjects = [
  { id: "p1", name: "Project Alpha", slug: "alpha", description: "First project", ownerId: "u1", createdAt: "2025-01-01" },
  { id: "p2", name: "Project Beta", slug: "beta", description: "", ownerId: "u1", createdAt: "2025-02-01" },
];

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(<ProjectsPage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);
  });

  it("renders projects list", async () => {
    mockApiFetch.mockResolvedValue({ success: true, projects: mockProjects });
    render(<ProjectsPage />);

    await screen.findByText("Project Alpha");
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
    expect(screen.getByText("First project")).toBeInTheDocument();
    expect(screen.getByText("No description")).toBeInTheDocument();
    expect(screen.getByText("/alpha")).toBeInTheDocument();
  });

  it("shows create modal", async () => {
    mockApiFetch.mockResolvedValue({ success: true, projects: [] });
    const user = userEvent.setup();
    render(<ProjectsPage />);

    await screen.findByText("No projects yet");
    await user.click(screen.getByRole("button", { name: /new project/i }));

    expect(screen.getByPlaceholderText("My Project")).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    mockApiFetch.mockResolvedValue({ success: true, projects: [] });
    render(<ProjectsPage />);

    await screen.findByText("No projects yet");
    expect(screen.getByText(/create your first project/i)).toBeInTheDocument();
  });
});
