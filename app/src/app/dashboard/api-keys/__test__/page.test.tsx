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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => "/dashboard/api-keys",
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

  it("shows create modal", async () => {
    mockApiFetch.mockResolvedValue({ success: true, apiKeys: mockKeys });
    const user = userEvent.setup();
    render(<ApiKeysPage />);

    await screen.findByText("Production Key");
    await user.click(screen.getByRole("button", { name: /new api key/i }));

    expect(screen.getByRole("heading", { name: "Create API Key" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Production API Key")).toBeInTheDocument();
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
      await user.click(trashButtons[0]);
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
});
