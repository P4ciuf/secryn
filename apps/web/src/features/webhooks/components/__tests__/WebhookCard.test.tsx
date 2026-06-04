import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WebhookCard } from "@/features/webhooks/components/WebhookCard";
import type { Webhook } from "@repo/shared";

const mockWebhook: Webhook = {
  id: "1",
  url: "https://api.example.com/webhook",
  events: ["secret.created", "secret.deleted"],
  status: "active",
  lastTriggered: "2026-06-02 09:15:23",
};

describe("<WebhookCard />", () => {
  it("should render the webhook URL", () => {
    render(<WebhookCard webhook={mockWebhook} onDelete={vi.fn()} />);
    expect(screen.getByText("https://api.example.com/webhook")).toBeInTheDocument();
  });

  it("should render the active status for an active webhook", () => {
    render(<WebhookCard webhook={mockWebhook} onDelete={vi.fn()} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("should render the inactive status for an inactive webhook", () => {
    const inactiveWebhook: Webhook = { ...mockWebhook, status: "inactive" };
    render(<WebhookCard webhook={inactiveWebhook} onDelete={vi.fn()} />);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("should render event badges", () => {
    render(<WebhookCard webhook={mockWebhook} onDelete={vi.fn()} />);
    expect(screen.getByText("secret.created")).toBeInTheDocument();
    expect(screen.getByText("secret.deleted")).toBeInTheDocument();
  });

  it("should render the last triggered time", () => {
    render(<WebhookCard webhook={mockWebhook} onDelete={vi.fn()} />);
    expect(screen.getByText("Last: 2026-06-02 09:15:23")).toBeInTheDocument();
  });

  it("should call onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<WebhookCard webhook={mockWebhook} onDelete={onDelete} />);

    await user.click(screen.getByRole("button"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("should render Never for never-triggered webhooks", () => {
    const neverTriggered: Webhook = { ...mockWebhook, lastTriggered: "Never" };
    render(<WebhookCard webhook={neverTriggered} onDelete={vi.fn()} />);
    expect(screen.getByText("Last: Never")).toBeInTheDocument();
  });
});
