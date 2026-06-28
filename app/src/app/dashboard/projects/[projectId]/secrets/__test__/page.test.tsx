import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SecretsPage from "../page";

const { mockApiFetch, mockApiFetchText } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
  mockApiFetchText: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
  apiFetchText: mockApiFetchText,
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
  useParams: () => ({ projectId: "proj-1" }),
  usePathname: () => "/dashboard/projects/proj-1/secrets",
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
    dashboard: { path: "/dashboard", children: { projects: "projects" } },
  },
}));

const mockSecrets = [
  {
    id: "s1",
    name: "DATABASE_URL",
    value: "postgres://localhost",
    notes: "Main database",
    projectId: "proj-1",
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
  },
  {
    id: "s2",
    name: "API_KEY",
    value: "secret-key-123",
    notes: "",
    projectId: "proj-1",
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
  },
];

const mockProject = { id: "proj-1", name: "My Project" };

function mockLoadSuccess() {
  mockApiFetch.mockImplementation((url: string) => {
    if (url === "/projects/proj-1") return Promise.resolve({ success: true, project: mockProject });
    if (url === "/projects/proj-1/secrets")
      return Promise.resolve({ success: true, secrets: mockSecrets });
    return Promise.resolve({});
  });
}

describe("SecretsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(<SecretsPage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);
  });

  it("renders secrets list", async () => {
    mockLoadSuccess();

    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");
    expect(screen.getByText("API_KEY")).toBeInTheDocument();
    expect(screen.getByText("Main database")).toBeInTheDocument();
  });

  it("shows error state on load failure", async () => {
    mockApiFetch.mockRejectedValue(new Error("Failed to load secrets"));
    render(<SecretsPage />);

    await screen.findByText("Failed to load secrets");
  });

  it("shows create modal", async () => {
    mockLoadSuccess();

    const user = userEvent.setup();
    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");
    await user.click(screen.getByRole("button", { name: /add secret/i }));

    expect(screen.getByRole("heading", { name: "Add Secret" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("DATABASE_URL")).toBeInTheDocument();
  });

  it("creates a new secret", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/projects/proj-1")
        return Promise.resolve({ success: true, project: mockProject });
      if (url === "/projects/proj-1/secrets")
        return Promise.resolve({ success: true, secrets: mockSecrets });
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");
    await user.click(screen.getByRole("button", { name: /add secret/i }));

    await user.type(screen.getByPlaceholderText("DATABASE_URL"), "NEW_KEY");
    await user.type(screen.getByPlaceholderText("secret value"), "new-value");
    await user.type(screen.getByPlaceholderText("Optional notes"), "a note");

    mockApiFetch.mockResolvedValueOnce({});
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/projects/proj-1/secrets", {
        method: "POST",
        body: JSON.stringify({ name: "NEW_KEY", value: "new-value", notes: "a note" }),
      });
    });
  });

  it("shows create error on failure", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/projects/proj-1")
        return Promise.resolve({ success: true, project: mockProject });
      if (url === "/projects/proj-1/secrets")
        return Promise.resolve({ success: true, secrets: mockSecrets });
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");
    await user.click(screen.getByRole("button", { name: /add secret/i }));

    await user.type(screen.getByPlaceholderText("DATABASE_URL"), "BAD");
    await user.type(screen.getByPlaceholderText("secret value"), "bad");

    mockApiFetch.mockRejectedValueOnce(new ApiError("Name already taken"));
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await screen.findByText("Name already taken");
  });

  it("shows edit modal", async () => {
    mockLoadSuccess();

    const user = userEvent.setup();
    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");
    await user.click(screen.getByText("DATABASE_URL"));

    expect(screen.getByRole("heading", { name: "Edit Secret" })).toBeInTheDocument();
  });

  it("updates a secret", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/projects/proj-1")
        return Promise.resolve({ success: true, project: mockProject });
      if (url === "/projects/proj-1/secrets")
        return Promise.resolve({ success: true, secrets: mockSecrets });
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");
    await user.click(screen.getByText("DATABASE_URL"));

    mockApiFetch.mockResolvedValueOnce({});
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/projects/proj-1/secrets/s1", {
        method: "PUT",
        body: JSON.stringify({
          name: "DATABASE_URL",
          value: "postgres://localhost",
          notes: "Main database",
        }),
      });
    });
  });

  it("handles delete with confirm dialog", async () => {
    mockLoadSuccess();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const user = userEvent.setup();
    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0] as Element);

    expect(confirmSpy).toHaveBeenCalledWith('Delete secret "DATABASE_URL"?');
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/projects/proj-1/secrets/s1", {
        method: "DELETE",
      });
    });

    confirmSpy.mockRestore();
  });

  it("renders empty state", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/projects/proj-1")
        return Promise.resolve({ success: true, project: mockProject });
      if (url === "/projects/proj-1/secrets")
        return Promise.resolve({ success: true, secrets: [] });
      return Promise.resolve({});
    });

    render(<SecretsPage />);

    await screen.findByText("No secrets yet");
    expect(screen.getByText(/add your first secret/i)).toBeInTheDocument();
  });

  it("toggles secret value visibility", async () => {
    mockLoadSuccess();

    const user = userEvent.setup();
    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");

    const dotsBefore = screen.getAllByText("••••••••••••••••••••••••");
    expect(dotsBefore.length).toBeGreaterThanOrEqual(1);

    const eyeButtons = screen.getAllByRole("button", { name: /show value/i });
    await user.click(eyeButtons[0] as Element);

    await screen.findByText("postgres://localhost");
  });

  it("renders the back to projects link", async () => {
    mockLoadSuccess();

    render(<SecretsPage />);

    await screen.findByText("DATABASE_URL");

    const backLink = screen.getByText("Back to projects");
    expect(backLink.closest("a")).toHaveAttribute("href", "/dashboard/projects");
  });
});
