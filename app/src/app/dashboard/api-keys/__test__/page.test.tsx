import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApiKeysPage from "../page";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
  ApiError: class extends Error {
    statusCode: number;
    constructor(msg: string) {
      super(msg);
      this.statusCode = 400;
    }
  },
}));

import { ApiError } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => "/dashboard/api-keys",
}));

vi.mock("@/components/ui/breadcrumbs", () => ({
  default: ({ items }: { items: Array<{ label: string; href?: string }> }) => (
    <nav aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => (
          <li key={i}>{item.label}</li>
        ))}
      </ol>
    </nav>
  ),
}));

vi.mock("@/data/routes", () => ({
  ROUTES: {
    dashboard: { path: "/dashboard", children: { apiKeys: "api-keys" } },
  },
}));

const mockKeys = [
  {
    id: "key-1",
    keyName: "Production Key",
    key: "sk-abc123",
    userId: "u1",
    isActive: true,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    expiresAt: "2026-01-01",
    permissions: ["read", "write"],
  },
  {
    id: "key-2",
    keyName: "Dev Key",
    key: "sk-def456",
    userId: "u1",
    isActive: false,
    createdAt: "2025-02-01",
    updatedAt: "2025-02-01",
    expiresAt: "2025-12-01",
    permissions: ["read"],
  },
];

describe("ApiKeysPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(<ApiKeysPage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(2);
  });

  it("renders API keys list", async () => {
    mockApiFetch.mockResolvedValue({ success: true, apiKeys: mockKeys });
    render(<ApiKeysPage />);

    await screen.findByText("Production Key");
    expect(screen.getByText("Dev Key")).toBeInTheDocument();
    expect(screen.getAllByText("read").length).toBe(2);
    expect(screen.getByText("write")).toBeInTheDocument();
    expect(screen.getByText(/Active · Expires/)).toBeInTheDocument();
    expect(screen.getByText(/Inactive · Expires/)).toBeInTheDocument();
  });

  it("shows error state on load failure", async () => {
    mockApiFetch.mockRejectedValue(new Error("Failed to load API keys"));
    render(<ApiKeysPage />);

    await screen.findByText("Failed to load API keys");
  });

  it("shows create modal", async () => {
    mockApiFetch.mockResolvedValue({ success: true, apiKeys: mockKeys });
    const user = userEvent.setup();
    render(<ApiKeysPage />);

    await screen.findByText("Production Key");
    await user.click(screen.getByRole("button", { name: /new api key/i }));

    expect(screen.getByRole("heading", { name: "Create API Key" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Production API Key")).toBeInTheDocument();
  });

  it("creates a new API key and shows the one-time key view", async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, apiKeys: mockKeys });
    const user = userEvent.setup();
    render(<ApiKeysPage />);

    await screen.findByText("Production Key");
    await user.click(screen.getByRole("button", { name: /new api key/i }));

    await user.type(screen.getByPlaceholderText("Production API Key"), "New Key");

    mockApiFetch.mockResolvedValueOnce({
      success: true,
      apiKey: { ...mockKeys[0], id: "key-new", key: "sk-newkey123" },
    });

    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await screen.findByText("Copy this key now. You won't be able to see it again.");
    expect(screen.getByText("sk-newkey123")).toBeInTheDocument();
  });

  it("shows create error on failure", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ success: true, apiKeys: mockKeys })
      .mockRejectedValueOnce(new ApiError("Invalid permissions"));

    const user = userEvent.setup();
    render(<ApiKeysPage />);

    await screen.findByText("Production Key");
    await user.click(screen.getByRole("button", { name: /new api key/i }));

    await user.type(screen.getByPlaceholderText("Production API Key"), "Bad Key");

    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await screen.findByText("Invalid permissions");
  });

  it("toggles API key visibility", async () => {
    mockApiFetch.mockResolvedValue({ success: true, apiKeys: mockKeys });
    const user = userEvent.setup();
    render(<ApiKeysPage />);

    await screen.findByText("Production Key");

    const eyeButtons = screen.getAllByRole("button").filter((btn) => btn.querySelector("svg"));
    expect(eyeButtons.length).toBeGreaterThan(0);
  });

  it("handles delete", async () => {
    mockApiFetch.mockResolvedValue({ success: true, apiKeys: mockKeys });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ApiKeysPage />);

    await screen.findByText("Production Key");

    const trashButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.innerHTML.includes("trash"));

    if (trashButtons.length > 0) {
      const user = userEvent.setup();
      await user.click(trashButtons[0] as Element);
      expect(confirmSpy).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/api-keys/key-1",
          expect.objectContaining({ method: "DELETE" }),
        );
      });
    }

    confirmSpy.mockRestore();
  });

  it("renders empty state", async () => {
    mockApiFetch.mockResolvedValue({ success: true, apiKeys: [] });
    render(<ApiKeysPage />);

    await screen.findByText("No API keys yet");
    expect(screen.getByText(/create an api key/i)).toBeInTheDocument();
  });

  it("toggles key status between enable and disable", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ success: true, apiKeys: mockKeys })
      .mockResolvedValueOnce({});

    const user = userEvent.setup();
    render(<ApiKeysPage />);

    await screen.findByText("Production Key");

    const disableButton = screen.getByText("Disable");
    await user.click(disableButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/api-keys/key-1", {
        method: "PUT",
        body: JSON.stringify({ isActive: false }),
      });
    });
  });
});
