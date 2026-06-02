import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import type { Project } from "@/types";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockProject: Project = {
  id: "1",
  name: "Production App",
  description: "Production environment secrets",
  secretCount: 12,
  updatedAt: "2026-06-01",
  color: "bg-blue-500",
};

describe("<ProjectCard />", () => {
  it("should render the project name", () => {
    renderWithRouter(<ProjectCard project={mockProject} index={0} />);
    expect(screen.getByText("Production App")).toBeInTheDocument();
  });

  it("should render the project description", () => {
    renderWithRouter(<ProjectCard project={mockProject} index={0} />);
    expect(screen.getByText("Production environment secrets")).toBeInTheDocument();
  });

  it("should render the secret count", () => {
    renderWithRouter(<ProjectCard project={mockProject} index={0} />);
    expect(screen.getByText("12 secrets")).toBeInTheDocument();
  });

  it("should render a link to the project secrets page", () => {
    renderWithRouter(<ProjectCard project={mockProject} index={0} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard/projects/1/secrets");
  });

  it("should render with an empty description", () => {
    const project: Project = { ...mockProject, description: "" };
    renderWithRouter(<ProjectCard project={project} index={0} />);
    expect(screen.getByText("Production App")).toBeInTheDocument();
  });
});
