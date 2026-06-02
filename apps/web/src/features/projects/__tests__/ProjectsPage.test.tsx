import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ProjectsPage from "@/features/projects/ProjectsPage";

vi.mock("@/components/common/PageHeader", () => ({
  PageHeader: ({
    title,
    subtitle,
    actionLabel,
    onAction,
  }: {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
    <div data-testid="mock-page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actionLabel && (
        <button data-testid="header-action-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/features/projects/components/ProjectCard", () => ({
  ProjectCard: ({ project }: { project: { id: string; name: string }; index: number }) => (
    <div data-testid={`project-card-${project.id}`}>{project.name}</div>
  ),
}));

vi.mock("@/features/projects/components/CreateProjectModal", () => ({
  CreateProjectModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="mock-create-modal">
        <button data-testid="modal-close-btn" onClick={onClose}>
          Close Modal
        </button>
      </div>
    ) : null,
}));

vi.mock("@/data/projects", () => ({
  mockProjects: [
    {
      id: "1",
      name: "Production App",
      description: "",
      secretCount: 12,
      updatedAt: "2026-06-01",
      color: "bg-blue-500",
    },
    {
      id: "2",
      name: "Staging",
      description: "",
      secretCount: 5,
      updatedAt: "2026-05-28",
      color: "bg-green-500",
    },
  ],
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("ProjectsPage", () => {
  it("should render the page header with title", () => {
    renderWithRouter(<ProjectsPage />);
    expect(screen.getByText("Projects")).toBeInTheDocument();
  });

  it("should render project cards from mock data", () => {
    renderWithRouter(<ProjectsPage />);
    expect(screen.getByTestId("project-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("project-card-2")).toBeInTheDocument();
  });

  it("should not show create modal by default", () => {
    renderWithRouter(<ProjectsPage />);
    expect(screen.queryByTestId("mock-create-modal")).not.toBeInTheDocument();
  });

  it("should show create modal when action button is clicked", async () => {
    renderWithRouter(<ProjectsPage />);
    const button = screen.getByTestId("header-action-btn");
    fireEvent.click(button);
    expect(screen.getByTestId("mock-create-modal")).toBeInTheDocument();
  });

  it("should close create modal when onClose is called", async () => {
    renderWithRouter(<ProjectsPage />);
    const openButton = screen.getByTestId("header-action-btn");
    fireEvent.click(openButton);
    expect(screen.getByTestId("mock-create-modal")).toBeInTheDocument();

    const closeButton = screen.getByTestId("modal-close-btn");
    fireEvent.click(closeButton);
    expect(screen.queryByTestId("mock-create-modal")).not.toBeInTheDocument();
  });
});
