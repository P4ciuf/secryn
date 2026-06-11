import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import ApiKeysPage from "@/features/api-keys/ApiKeysPage";
import { api } from "@/lib/api";
import type { ApiKey } from "@repo/shared";

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
      <ApiKeysPage />
    </MemoryRouter>,
  );
}

const mockKey: ApiKey = {
  id: "key-1",
  keyName: "Production API Key",
  key: "sc_prod_abc123",
  userId: "user-1",
  isActive: true,
  createdAt: "2026-05-15T10:00:00.000Z",
  updatedAt: "2026-06-02T08:30:00.000Z",
  expiresAt: "2026-08-15T10:00:00.000Z",
  permissions: ["read", "write"],
};

const mockKey2: ApiKey = {
  id: "key-2",
  keyName: "Development API Key",
  key: "sc_dev_def456",
  userId: "user-1",
  isActive: true,
  createdAt: "2026-05-20T10:00:00.000Z",
  updatedAt: "2026-06-01T08:30:00.000Z",
  expiresAt: "2026-07-20T10:00:00.000Z",
  permissions: ["read"],
};

describe("ApiKeysPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading state", () => {
    it("shows loading text in table while fetching keys", () => {
      mockApi.get.mockReturnValue(new Promise<never>(() => {}));
      renderPage();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("shows error message when GET /api-keys fails", async () => {
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
        expect(screen.getByText("Failed to load API keys")).toBeInTheDocument();
      });
    });

    it("shows error when delete fails", async () => {
      mockApi.get.mockResolvedValue([mockKey]);
      mockApi.delete.mockRejectedValue(new Error("Delete failed"));

      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Production API Key")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByTitle("Delete"));

      await waitFor(() => {
        expect(screen.getByText("Delete failed")).toBeInTheDocument();
      });
    });

    it("shows error when create fails", async () => {
      mockApi.get.mockResolvedValue([]);
      mockApi.post.mockRejectedValue(new Error("Create failed"));

      renderPage();
      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /create api key/i }));

      fireEvent.change(screen.getByPlaceholderText("My API Key"), {
        target: { value: "My Key" },
      });
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(screen.getByText("Create failed")).toBeInTheDocument();
      });
    });
  });

  describe("Populated state", () => {
    it("renders API key rows when keys are returned", async () => {
      mockApi.get.mockResolvedValue([mockKey, mockKey2]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Production API Key")).toBeInTheDocument();
      });
      expect(screen.getByText("Development API Key")).toBeInTheDocument();
    });

    it("renders page header with title and create button", async () => {
      mockApi.get.mockResolvedValue([mockKey]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("API Keys")).toBeInTheDocument();
      });
      expect(screen.getByText("Manage your API keys for programmatic access")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create api key/i })).toBeInTheDocument();
    });

    it("renders permission badges for each key", async () => {
      mockApi.get.mockResolvedValue([mockKey]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Production API Key")).toBeInTheDocument();
      });
      expect(screen.getByText("read")).toBeInTheDocument();
      expect(screen.getByText("write")).toBeInTheDocument();
    });

    it("renders expiresAt timestamp for keys", async () => {
      mockApi.get.mockResolvedValue([mockKey]);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Production API Key")).toBeInTheDocument();
      });
      expect(screen.getByText("2026-08-15T10:00:00.000Z")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("renders table with no rows when keys array is empty", async () => {
      mockApi.get.mockResolvedValue([]);
      renderPage();

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });
      expect(screen.queryByText("Production API Key")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
    });
  });

  describe("Create key", () => {
    it("opens create modal when action button is clicked", async () => {
      mockApi.get.mockResolvedValue([]);
      renderPage();

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /create api key/i }));

      expect(screen.getByText("Create New API Key")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("My API Key")).toBeInTheDocument();
      expect(screen.getByLabelText("read")).toBeInTheDocument();
      expect(screen.getByLabelText("write")).toBeInTheDocument();
    });

    it("closes modal when cancel is clicked", async () => {
      mockApi.get.mockResolvedValue([]);
      renderPage();

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /create api key/i }));
      expect(screen.getByText("Create New API Key")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => {
        expect(screen.queryByText("Create New API Key")).not.toBeInTheDocument();
      });
    });

    it("calls api.post with name and permissions on submit", async () => {
      mockApi.get.mockResolvedValue([]);
      const newKey: ApiKey = {
        id: "key-3",
        keyName: "My New Key",
        key: "sc_new_ghi789",
        userId: "user-1",
        isActive: true,
        createdAt: "2026-06-03T10:00:00.000Z",
        updatedAt: "2026-06-03T10:00:00.000Z",
        expiresAt: "2026-09-03T10:00:00.000Z",
        permissions: ["read", "write"],
      };
      mockApi.post.mockResolvedValue(newKey);

      renderPage();
      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /create api key/i }));

      fireEvent.change(screen.getByPlaceholderText("My API Key"), {
        target: { value: "My New Key" },
      });
      await user.click(screen.getByLabelText("write"));
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith("/api-keys", {
          name: "My New Key",
          permissions: ["read", "write"],
        });
      });
    });

    it("adds new key to the list after successful create", async () => {
      mockApi.get.mockResolvedValue([]);
      const newKey: ApiKey = {
        id: "key-3",
        keyName: "My New Key",
        key: "sc_new_ghi789",
        userId: "user-1",
        isActive: true,
        createdAt: "2026-06-03T10:00:00.000Z",
        updatedAt: "2026-06-03T10:00:00.000Z",
        expiresAt: "2026-09-03T10:00:00.000Z",
        permissions: ["read"],
      };
      mockApi.post.mockResolvedValue(newKey);

      renderPage();
      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /create api key/i }));
      fireEvent.change(screen.getByPlaceholderText("My API Key"), {
        target: { value: "My New Key" },
      });
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => {
        expect(screen.getByText("My New Key")).toBeInTheDocument();
      });
      expect(screen.queryByText("Create New API Key")).not.toBeInTheDocument();
    });
  });

  describe("Delete key", () => {
    it("calls api.delete and removes key from list", async () => {
      mockApi.get.mockResolvedValue([mockKey, mockKey2]);
      mockApi.delete.mockResolvedValue(undefined);

      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Production API Key")).toBeInTheDocument();
        expect(screen.getByText("Development API Key")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const deleteButtons = screen.getAllByTitle("Delete");
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockApi.delete).toHaveBeenCalledWith("/api-keys/key-1");
      });

      await waitFor(() => {
        expect(screen.queryByText("Production API Key")).not.toBeInTheDocument();
      });
      expect(screen.getByText("Development API Key")).toBeInTheDocument();
    });
  });
});
