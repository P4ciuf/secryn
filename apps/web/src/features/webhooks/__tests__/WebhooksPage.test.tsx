import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import WebhooksPage from "@/features/webhooks/WebhooksPage";

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

vi.mock("@/features/webhooks/components/WebhookCard", () => ({
  WebhookCard: ({
    webhook,
    onDelete,
  }: {
    webhook: { id: string; url: string };
    onDelete: () => void;
  }) => (
    <div data-testid={`webhook-card-${webhook.id}`}>
      <span>{webhook.url}</span>
      <button data-testid={`delete-${webhook.id}`} onClick={onDelete}>
        Delete
      </button>
    </div>
  ),
}));

vi.mock("@/features/webhooks/components/CreateWebhookModal", () => ({
  CreateWebhookModal: ({
    open,
    onClose,
    onSubmit,
  }: {
    open: boolean;
    onClose: () => void;
    onSubmit: (url: string, events: string[]) => void;
  }) =>
    open ? (
      <div data-testid="mock-create-modal">
        <button data-testid="modal-close-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          data-testid="modal-submit-btn"
          onClick={() => onSubmit("https://example.com/webhook", ["secret.created"])}
        >
          Create
        </button>
      </div>
    ) : null,
}));

vi.mock("@/data/webhooks", () => ({
  mockWebhooks: [
    {
      id: "1",
      url: "https://api.example.com/webhook",
      events: ["secret.created"],
      status: "active" as const,
      lastTriggered: "2026-06-02",
    },
  ],
}));

describe("WebhooksPage", () => {
  it("should render the page header with title", () => {
    render(<WebhooksPage />);
    expect(screen.getByText("Webhooks")).toBeInTheDocument();
  });

  it("should render webhook cards from mock data", () => {
    render(<WebhooksPage />);
    expect(screen.getByTestId("webhook-card-1")).toBeInTheDocument();
  });

  it("should not show create modal by default", () => {
    render(<WebhooksPage />);
    expect(screen.queryByTestId("mock-create-modal")).not.toBeInTheDocument();
  });

  it("should show create modal when action button is clicked", async () => {
    render(<WebhooksPage />);
    screen.getByTestId("header-action-btn").click();
    await waitFor(() => {
      expect(screen.getByTestId("mock-create-modal")).toBeInTheDocument();
    });
  });

  it("should add a new webhook on submit", async () => {
    render(<WebhooksPage />);
    screen.getByTestId("header-action-btn").click();
    await waitFor(() => {
      expect(screen.getByTestId("mock-create-modal")).toBeInTheDocument();
    });
    screen.getByTestId("modal-submit-btn").click();
    await waitFor(() => {
      expect(screen.queryByTestId("mock-create-modal")).not.toBeInTheDocument();
    });
  });

  it("should remove a webhook on delete", async () => {
    render(<WebhooksPage />);
    const deleteBtn = screen.getByTestId("delete-1");
    deleteBtn.click();
    await waitFor(() => {
      expect(screen.queryByTestId("webhook-card-1")).not.toBeInTheDocument();
    });
  });
});
