import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import WebhooksPage from "@/features/webhooks/WebhooksPage";
import { api } from "@/lib/api";
import type { Webhook } from "@/types";

vi.mock("@/lib/api");

const mockApi = vi.mocked(api);

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn() },
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <WebhooksPage />
    </MemoryRouter>,
  );
}

const mockWebhook: Webhook = {
  id: "wh-1",
  url: "https://api.example.com/webhook",
  events: ["secret.created", "secret.deleted"],
  status: "active",
  lastTriggered: "2026-06-02",
};

const mockWebhook2: Webhook = {
  id: "wh-2",
  url: "https://hooks.myservice.com/events",
  events: ["project.created"],
  status: "inactive",
  lastTriggered: "never",
};

function getDeleteButtonInside(element: HTMLElement): HTMLElement {
  const container = element.closest<HTMLElement>(".bg-slate-800.border-slate-700.rounded-xl.p-6");
  if (!container) throw new Error("Could not find webhook card container");
  return within(container).getByRole("button");
}

describe("WebhooksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading state", () => {
    it("shows skeleton placeholder while fetching webhooks", () => {
      mockApi.get.mockReturnValue(new Promise<never>(() => {}));
      renderPage();
      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("shows error message when GET /webhooks fails", async () => {
      mockApi.get.mockRejectedValue(new Error("Network Error"));
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Network Error")).toBeInTheDocument();
      });
    });

    it("shows fallback error message for non-Error rejections", async () => {
      mockApi.get.mockRejectedValue("some string");
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Failed to load webhooks")).toBeInTheDocument();
      });
    });

    it("shows error when delete fails", async () => {
      mockApi.get.mockResolvedValue([mockWebhook]);
      mockApi.delete.mockRejectedValue(new Error("Delete failed"));

      renderPage();
      await waitFor(() => {
        expect(screen.getByText("https://api.example.com/webhook")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const deleteBtn = getDeleteButtonInside(screen.getByText("https://api.example.com/webhook"));
      await user.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByText("Delete failed")).toBeInTheDocument();
      });
    });

    it("shows error when create fails", async () => {
      mockApi.get.mockResolvedValue([]);
      mockApi.post.mockRejectedValue(new Error("Create failed"));

      renderPage();
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Webhooks" })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /add webhook/i }));

      fireEvent.change(screen.getByPlaceholderText("https://api.example.com/webhook"), {
        target: { value: "https://my.webhook.com" },
      });
      await user.click(screen.getByLabelText("secret.created"));
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(screen.getByText("Create failed")).toBeInTheDocument();
      });
    });
  });

  describe("Populated state", () => {
    it("renders webhook cards when webhooks are returned", async () => {
      mockApi.get.mockResolvedValue([mockWebhook, mockWebhook2]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("https://api.example.com/webhook")).toBeInTheDocument();
      });
      expect(screen.getByText("https://hooks.myservice.com/events")).toBeInTheDocument();
    });

    it("renders page header with title and action button", async () => {
      mockApi.get.mockResolvedValue([mockWebhook]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Webhooks" })).toBeInTheDocument();
      });
      expect(
        screen.getByText("Receive real-time notifications for events in your vault"),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add webhook/i })).toBeInTheDocument();
    });

    it("renders active status badge for active webhooks", async () => {
      mockApi.get.mockResolvedValue([mockWebhook]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Active")).toBeInTheDocument();
      });
    });

    it("renders inactive status badge for inactive webhooks", async () => {
      mockApi.get.mockResolvedValue([mockWebhook2]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Inactive")).toBeInTheDocument();
      });
    });

    it("renders event tags for each webhook", async () => {
      mockApi.get.mockResolvedValue([mockWebhook]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("secret.created")).toBeInTheDocument();
        expect(screen.getByText("secret.deleted")).toBeInTheDocument();
      });
    });

    it("renders last triggered timestamp", async () => {
      mockApi.get.mockResolvedValue([mockWebhook]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Last: 2026-06-02")).toBeInTheDocument();
      });
    });
  });

  describe("Empty state", () => {
    it("renders no webhook cards when array is empty", async () => {
      mockApi.get.mockResolvedValue([]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Webhooks" })).toBeInTheDocument();
      });
      expect(screen.queryByText("https://api.example.com/webhook")).not.toBeInTheDocument();
    });
  });

  describe("Create webhook", () => {
    it("opens create modal when action button is clicked", async () => {
      mockApi.get.mockResolvedValue([]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Webhooks" })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /add webhook/i }));

      expect(screen.getByRole("heading", { name: "Add Webhook" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("https://api.example.com/webhook")).toBeInTheDocument();
      expect(screen.getByLabelText("secret.created")).toBeInTheDocument();
      expect(screen.getByLabelText("secret.updated")).toBeInTheDocument();
      expect(screen.getByLabelText("secret.deleted")).toBeInTheDocument();
      expect(screen.getByLabelText("project.created")).toBeInTheDocument();
      expect(screen.getByLabelText("project.deleted")).toBeInTheDocument();
    });

    it("closes modal when cancel is clicked", async () => {
      mockApi.get.mockResolvedValue([]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Webhooks" })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /add webhook/i }));
      expect(screen.getByRole("heading", { name: "Add Webhook" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "Add Webhook" })).not.toBeInTheDocument();
      });
    });

    it("calls api.post with url and events on submit", async () => {
      mockApi.get.mockResolvedValue([]);
      const newWebhook: Webhook = {
        id: "wh-3",
        url: "https://my.webhook.com",
        events: ["secret.created", "project.created"],
        status: "active",
        lastTriggered: "never",
      };
      mockApi.post.mockResolvedValue(newWebhook);

      renderPage();
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Webhooks" })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /add webhook/i }));

      fireEvent.change(screen.getByPlaceholderText("https://api.example.com/webhook"), {
        target: { value: "https://my.webhook.com" },
      });
      await user.click(screen.getByLabelText("secret.created"));
      await user.click(screen.getByLabelText("project.created"));
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith("/webhooks", {
          url: "https://my.webhook.com",
          events: ["secret.created", "project.created"],
        });
      });
    });

    it("adds new webhook to the list after successful create", async () => {
      mockApi.get.mockResolvedValue([]);
      const newWebhook: Webhook = {
        id: "wh-3",
        url: "https://my.webhook.com",
        events: ["secret.created"],
        status: "active",
        lastTriggered: "never",
      };
      mockApi.post.mockResolvedValue(newWebhook);

      renderPage();
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Webhooks" })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /add webhook/i }));

      fireEvent.change(screen.getByPlaceholderText("https://api.example.com/webhook"), {
        target: { value: "https://my.webhook.com" },
      });
      await user.click(screen.getByLabelText("secret.created"));
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(screen.getByText("https://my.webhook.com")).toBeInTheDocument();
      });
      expect(screen.queryByRole("heading", { name: "Add Webhook" })).not.toBeInTheDocument();
    });

    it("has create button disabled when no events are selected", async () => {
      mockApi.get.mockResolvedValue([]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Webhooks" })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /add webhook/i }));

      const createBtn = screen.getByRole("button", { name: "Create" });
      expect(createBtn).toBeDisabled();
    });
  });

  describe("Delete webhook", () => {
    it("calls api.delete and removes webhook from list", async () => {
      mockApi.get.mockResolvedValue([mockWebhook, mockWebhook2]);
      mockApi.delete.mockResolvedValue(undefined);

      renderPage();
      await waitFor(() => {
        expect(screen.getByText("https://api.example.com/webhook")).toBeInTheDocument();
        expect(screen.getByText("https://hooks.myservice.com/events")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const deleteBtn = getDeleteButtonInside(screen.getByText("https://api.example.com/webhook"));
      await user.click(deleteBtn);

      await waitFor(() => {
        expect(mockApi.delete).toHaveBeenCalledWith("/webhooks/wh-1");
      });

      await waitFor(() => {
        expect(screen.queryByText("https://api.example.com/webhook")).not.toBeInTheDocument();
      });
      expect(screen.getByText("https://hooks.myservice.com/events")).toBeInTheDocument();
    });
  });
});
