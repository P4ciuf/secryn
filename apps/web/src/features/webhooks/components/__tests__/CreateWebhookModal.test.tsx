import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateWebhookModal } from "@/features/webhooks/components/CreateWebhookModal";
import type { WebhookEvent } from "@/types";

vi.mock("@/components/common/Modal", () => ({
  Modal: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="mock-modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

vi.mock("@/data/webhooks", () => ({
  availableEvents: [
    "secret.created",
    "secret.updated",
    "secret.deleted",
    "project.created",
    "project.deleted",
  ] as WebhookEvent[],
}));

describe("<CreateWebhookModal />", () => {
  it("should render when open is true", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateWebhookModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
    expect(screen.getByText("Add Webhook")).toBeInTheDocument();
  });

  it("should render URL input and event checkboxes", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<CreateWebhookModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByPlaceholderText("https://api.example.com/webhook")).toBeInTheDocument();
    expect(screen.getByText("secret.created")).toBeInTheDocument();
  });

  it("should call onSubmit with URL and selected events", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<CreateWebhookModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    await user.type(
      screen.getByPlaceholderText("https://api.example.com/webhook"),
      "https://example.com/hook",
    );
    await user.click(screen.getByText("secret.created"));

    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledWith("https://example.com/hook", ["secret.created"]);
  });

  it("should disable Create button when no events are selected", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(<CreateWebhookModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    const createButton = screen.getByRole("button", { name: "Create" });
    expect(createButton).toBeDisabled();
  });

  it("should call onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CreateWebhookModal open={true} onClose={onClose} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
