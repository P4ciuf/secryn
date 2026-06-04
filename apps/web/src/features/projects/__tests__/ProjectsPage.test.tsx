import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import ProjectsPage from "../ProjectsPage";
import { api } from "../../../lib/api";
import type { Project } from "@repo/shared";

vi.mock("../../../lib/api");

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>,
  );
}

const mockProjects: Project[] = [
  {
    id: "1",
    name: "Production App",
    slug: "production-app",
    description: "Production environment variables",
    ownerId: "owner-1",
    secrets: Array.from({ length: 12 }, (_, i) => ({ id: `s-${i}` })),
    color: "bg-blue-500",
    createdAt: "2026-05-01",
    updatedAt: "2026-06-01",
  },
  {
    id: "2",
    name: "Staging",
    slug: "staging",
    description: "Staging environment variables",
    ownerId: "owner-1",
    secrets: Array.from({ length: 5 }, (_, i) => ({ id: `s-${i}` })),
    color: "bg-green-500",
    createdAt: "2026-04-28",
    updatedAt: "2026-05-28",
  },
];

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton placeholders while fetching projects", () => {
    vi.mocked(api.get).mockReturnValue(new Promise<Project[]>(() => {}));
    renderWithRouter();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons).toHaveLength(3);
  });

  it("shows error message when fetching projects fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network error"));
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("renders project cards when API returns projects", async () => {
    vi.mocked(api.get).mockResolvedValue(mockProjects);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Production App")).toBeInTheDocument();
    });
    expect(screen.getByText("Staging")).toBeInTheDocument();
    expect(screen.getByText("Production environment variables")).toBeInTheDocument();
    expect(screen.getByText("Staging environment variables")).toBeInTheDocument();
    expect(screen.getByText("12 secrets")).toBeInTheDocument();
    expect(screen.getByText("5 secrets")).toBeInTheDocument();
  });

  it("renders empty grid when API returns an empty array", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.queryByText("Production App")).not.toBeInTheDocument();
      expect(screen.queryByText("Staging")).not.toBeInTheDocument();
    });
  });

  it("opens create project modal, fills form, submits, and calls api.post", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    const createdProject: Project = {
      id: "3",
      name: "New Project",
      slug: "new-project",
      description: "A brand new project",
      ownerId: "owner-1",
      secrets: [],
      color: "bg-purple-500",
      createdAt: "2026-06-03",
      updatedAt: "2026-06-03",
    };
    vi.mocked(api.post).mockResolvedValue(createdProject);

    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create project/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create project/i }));

    expect(screen.getByText("Create New Project")).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("My Project"), {
        target: { value: "New Project" },
      });
      fireEvent.change(screen.getByPlaceholderText("Project description..."), {
        target: { value: "A brand new project" },
      });
    });

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/projects", {
        name: "New Project",
        description: "A brand new project",
      });
    });

    await waitFor(() => {
      expect(screen.queryByText("Create New Project")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("New Project")).toBeInTheDocument();
    });
  });

  it("closes the create project modal when Cancel is clicked", async () => {
    vi.mocked(api.get).mockResolvedValue(mockProjects);
    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create project/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create project/i }));

    expect(screen.getByText("Create New Project")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Create New Project")).not.toBeInTheDocument();
    });

    expect(vi.mocked(api.post)).not.toHaveBeenCalled();
  });

  it("shows error when project creation fails", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockRejectedValue(new Error("Creation failed"));

    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create project/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create project/i }));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("My Project"), {
        target: { value: "Failing Project" },
      });
    });

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText("Creation failed")).toBeInTheDocument();
    });
  });
});
