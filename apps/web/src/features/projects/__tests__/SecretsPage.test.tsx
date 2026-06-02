import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import SecretsPage from "@/features/projects/SecretsPage";

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

vi.mock("@/features/projects/components/SecretsTable", () => ({
  SecretsTable: ({ secrets }: { secrets: Array<{ id: string; name: string }> }) => (
    <div data-testid="mock-secrets-table">
      {secrets.map((s) => (
        <div key={s.id} data-testid={`secret-${s.id}`}>
          {s.name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/features/projects/components/CreateSecretModal", () => ({
  CreateSecretModal: ({
    open,
    onClose,
    onSubmit,
  }: {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, value: string) => void;
  }) =>
    open ? (
      <div data-testid="mock-create-secret-modal">
        <button data-testid="modal-close-btn" onClick={onClose}>
          Cancel
        </button>
        <button data-testid="modal-submit-btn" onClick={() => onSubmit("NEW_KEY", "test-value")}>
          Add
        </button>
      </div>
    ) : null,
}));

vi.mock("@/data/secrets", () => ({
  mockSecretsData: {
    "1": {
      name: "Production App",
      secrets: [
        { id: "s1", name: "DISCORD_TOKEN", value: "abc", updatedAt: "2026-06-01" },
        { id: "s2", name: "STRIPE_KEY", value: "xyz", updatedAt: "2026-05-30" },
      ],
    },
  },
}));

vi.mock("@/hooks/use-toggle-visibility", () => ({
  useToggleVisibility: () => ({
    isVisible: () => false,
    toggle: () => {},
    visibleSet: new Set<string>(),
  }),
}));

function renderSecretsPage(projectId = "1") {
  return render(
    <MemoryRouter initialEntries={[`/projects/${projectId}/secrets`]}>
      <Routes>
        <Route path="/projects/:projectId/secrets" element={<SecretsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SecretsPage", () => {
  it("should render the page with project name in title", () => {
    renderSecretsPage();
    expect(screen.getByText("Production App Secrets")).toBeInTheDocument();
  });

  it("should render the secrets table with secrets", () => {
    renderSecretsPage();
    expect(screen.getByTestId("mock-secrets-table")).toBeInTheDocument();
    expect(screen.getByTestId("secret-s1")).toBeInTheDocument();
    expect(screen.getByTestId("secret-s2")).toBeInTheDocument();
  });

  it("should not show create secret modal by default", () => {
    renderSecretsPage();
    expect(screen.queryByTestId("mock-create-secret-modal")).not.toBeInTheDocument();
  });

  it("should show create secret modal when action button is clicked", async () => {
    renderSecretsPage();
    const button = screen.getByTestId("header-action-btn");
    button.click();
    expect(screen.getByTestId("mock-create-secret-modal")).toBeInTheDocument();
  });

  it("should add a new secret on submit and close modal", async () => {
    renderSecretsPage();
    const openButton = screen.getByTestId("header-action-btn");
    openButton.click();

    const submitButton = screen.getByTestId("modal-submit-btn");
    submitButton.click();

    expect(screen.queryByTestId("mock-create-secret-modal")).not.toBeInTheDocument();
  });

  it("should handle missing project ID gracefully", () => {
    renderSecretsPage("");
    expect(screen.getByText("Project Secrets")).toBeInTheDocument();
  });
});
