import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

import { ApiError } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => "/dashboard/projects",
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
    dashboard: { path: "/dashboard", children: { projects: "projects" } },
  },
}));

const mockProjects = [
  {
    id: "p1",
    name: "Project Alpha",
    slug: "alpha",
    description: "First project",
    ownerId: "u1",
    createdAt: "2025-01-01",
  },
  {
    id: "p2",
    name: "Project Beta",
    slug: "beta",
    description: "",
    ownerId: "u1",
    createdAt: "2025-02-01",
  },
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

  it("shows error state on load failure", async () => {
    mockApiFetch.mockRejectedValue(new Error("Failed to load projects"));
    render(<ProjectsPage />);

    await screen.findByText("Failed to load projects");
  });

  it("shows create modal", async () => {
    mockApiFetch.mockResolvedValue({ success: true, projects: [] });
    const user = userEvent.setup();
    render(<ProjectsPage />);

    await screen.findByText("No projects yet");
    await user.click(screen.getByRole("button", { name: /new project/i }));

    expect(screen.getByPlaceholderText("My Project")).toBeInTheDocument();
  });

  it("creates a new project", async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, projects: [] });
    const user = userEvent.setup();
    render(<ProjectsPage />);

    await screen.findByText("No projects yet");
    await user.click(screen.getByRole("button", { name: /new project/i }));

    await user.type(screen.getByPlaceholderText("My Project"), "New Project");
    await user.type(screen.getByPlaceholderText("Optional description"), "A test project");

    mockApiFetch.mockResolvedValueOnce({});

    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/projects", {
        method: "POST",
        body: JSON.stringify({ name: "New Project", description: "A test project" }),
      });
    });
  });

  it("shows create error on failure", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ success: true, projects: [] })
      .mockRejectedValueOnce(new ApiError("Name already taken"));

    const user = userEvent.setup();
    render(<ProjectsPage />);

    await screen.findByText("No projects yet");
    await user.click(screen.getByRole("button", { name: /new project/i }));

    await user.type(screen.getByPlaceholderText("My Project"), "Dup");

    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await screen.findByText("Name already taken");
  });

  it("handles delete with confirm dialog", async () => {
    mockApiFetch.mockResolvedValue({ success: true, projects: mockProjects });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProjectsPage />);

    await screen.findByText("Project Alpha");

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    const user = userEvent.setup();
    await user.click(deleteButtons[0] as Element);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Delete project "Project Alpha"? This will remove all secrets.',
    );
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/projects/p1", {
        method: "DELETE",
      });
    });

    confirmSpy.mockRestore();
  });

  it("renders empty state", async () => {
    mockApiFetch.mockResolvedValue({ success: true, projects: [] });
    render(<ProjectsPage />);

    await screen.findByText("No projects yet");
    expect(screen.getByText(/create your first project/i)).toBeInTheDocument();
  });
});
