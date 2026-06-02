import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApiDocsPage from "@/features/api-docs/ApiDocsPage";

vi.mock("@/components/common/PageHeader", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="mock-page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock("@/data/api-docs", () => ({
  codeExamples: {
    curl: "curl example code",
    node: "node example code",
    python: "python example code",
  },
  endpoints: [
    {
      method: "GET" as const,
      path: "/v1/projects",
      description: "List all projects",
      color: "bg-green-600",
    },
    {
      method: "POST" as const,
      path: "/v1/projects",
      description: "Create a new project",
      color: "bg-blue-600",
    },
    {
      method: "DELETE" as const,
      path: "/v1/secrets/:id",
      description: "Delete a secret",
      color: "bg-red-600",
    },
  ],
}));

describe("ApiDocsPage", () => {
  it("should render the page header", () => {
    render(<ApiDocsPage />);
    expect(screen.getByText("API Documentation")).toBeInTheDocument();
    expect(
      screen.getByText("Learn how to integrate SecureVault into your applications"),
    ).toBeInTheDocument();
  });

  it("should render getting started card", () => {
    render(<ApiDocsPage />);
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
  });

  it("should render security card", () => {
    render(<ApiDocsPage />);
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("should render code examples section with tabs", () => {
    render(<ApiDocsPage />);
    expect(screen.getByText("Code Examples")).toBeInTheDocument();
    expect(screen.getByText("CURL")).toBeInTheDocument();
    expect(screen.getByText("NODE")).toBeInTheDocument();
    expect(screen.getByText("PYTHON")).toBeInTheDocument();
  });

  it("should show curl example by default", () => {
    render(<ApiDocsPage />);
    expect(screen.getByText("curl example code")).toBeInTheDocument();
  });

  it("should switch to node example when tab is clicked", async () => {
    const user = userEvent.setup();
    render(<ApiDocsPage />);

    await user.click(screen.getByText("NODE"));
    expect(screen.getByText("node example code")).toBeInTheDocument();
  });

  it("should render API endpoints", () => {
    render(<ApiDocsPage />);
    expect(screen.getByText("API Endpoints")).toBeInTheDocument();
    expect(screen.getByText("GET")).toBeInTheDocument();
    expect(screen.getByText("POST")).toBeInTheDocument();
    expect(screen.getByText("DELETE")).toBeInTheDocument();
    expect(screen.getAllByText("/v1/projects")).toHaveLength(2);
  });
});
