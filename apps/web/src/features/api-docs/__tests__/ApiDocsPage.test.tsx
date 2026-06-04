import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import ApiDocsPage from "@/features/api-docs/ApiDocsPage";
import { api, ApiError } from "@/lib/api";
import type { ApiEndpoint } from "@/types";

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
      <ApiDocsPage />
    </MemoryRouter>,
  );
}

const mockEndpoints: ApiEndpoint[] = [
  { method: "GET", path: "/v1/health", description: "Health check", color: "bg-green-600" },
  {
    method: "POST",
    path: "/v1/projects",
    description: "Create a new project",
    color: "bg-blue-600",
  },
  {
    method: "DELETE",
    path: "/v1/secrets/:id",
    description: "Delete a secret",
    color: "bg-red-600",
  },
];

function setupApiMock(endpoints?: ApiEndpoint[]) {
  mockApi.get.mockImplementation(async (path: string) => {
    if (path === "/health") {
      return { status: "ok" } as { status: string };
    }
    if (path === "/docs/endpoints") {
      if (endpoints) {
        return endpoints as ApiEndpoint[];
      }
      throw new Error("Not found");
    }
    throw new Error("Unknown path");
  });
}

describe("ApiDocsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Page header and static cards", () => {
    it("renders the page header with title and subtitle", () => {
      setupApiMock([]);
      renderPage();
      expect(screen.getByText("API Documentation")).toBeInTheDocument();
      expect(
        screen.getByText("Learn how to integrate SecureVault into your applications"),
      ).toBeInTheDocument();
    });

    it("renders Getting Started card", () => {
      setupApiMock([]);
      renderPage();
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
      expect(screen.getByText("YOUR_API_KEY")).toBeInTheDocument();
      expect(screen.getByText("Authorization:")).toBeInTheDocument();
      expect(screen.getByText("Bearer")).toBeInTheDocument();
    });

    it("renders Security card", () => {
      setupApiMock([]);
      renderPage();
      expect(screen.getByText("Security")).toBeInTheDocument();
      expect(screen.getByText("Keep your API keys secret")).toBeInTheDocument();
    });
  });

  describe("Code Examples", () => {
    it("renders code examples section with all three tabs", () => {
      setupApiMock([]);
      renderPage();
      expect(screen.getByText("Code Examples")).toBeInTheDocument();
      expect(screen.getByText("CURL")).toBeInTheDocument();
      expect(screen.getByText("NODE")).toBeInTheDocument();
      expect(screen.getByText("PYTHON")).toBeInTheDocument();
    });

    it("shows curl example by default", () => {
      setupApiMock([]);
      renderPage();
      const codeBlock = screen.getByText(/curl/);
      expect(codeBlock).toBeInTheDocument();
    });

    it("switches to node example when NODE tab is clicked", async () => {
      setupApiMock([]);
      renderPage();

      const user = userEvent.setup();
      await user.click(screen.getByText("NODE"));

      expect(screen.getByText(/securevault-sdk/)).toBeInTheDocument();
    });

    it("switches to python example when PYTHON tab is clicked", async () => {
      setupApiMock([]);
      renderPage();

      const user = userEvent.setup();
      await user.click(screen.getByText("PYTHON"));

      expect(screen.getByText(/import securevault/)).toBeInTheDocument();
    });
  });

  describe("EndpointList - loading", () => {
    it("shows skeleton pulse placeholders while endpoints load", () => {
      mockApi.get.mockReturnValue(new Promise<never>(() => {}));
      renderPage();

      const endpointSection = screen.getByText("API Endpoints").closest(".bg-slate-800");
      expect(endpointSection).toBeInTheDocument();
      const skeletons = endpointSection!.querySelectorAll(".animate-pulse .h-12");
      expect(skeletons.length).toBe(3);
    });
  });

  describe("EndpointList - populated from API", () => {
    it("renders endpoints from API response", async () => {
      setupApiMock(mockEndpoints);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Health check")).toBeInTheDocument();
        expect(screen.getByText("Create a new project")).toBeInTheDocument();
        expect(screen.getByText("Delete a secret")).toBeInTheDocument();
      });
    });

    it("renders method badges with correct colors", async () => {
      setupApiMock(mockEndpoints);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Health check")).toBeInTheDocument();
      });

      const getElements = screen.getAllByText("GET");
      const postElements = screen.getAllByText("POST");
      const deleteElements = screen.getAllByText("DELETE");

      expect(getElements.length).toBeGreaterThanOrEqual(1);
      expect(postElements.length).toBeGreaterThanOrEqual(1);
      expect(deleteElements.length).toBeGreaterThanOrEqual(1);
    });

    it("renders endpoint paths", async () => {
      setupApiMock(mockEndpoints);
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("/v1/health")).toBeInTheDocument();
        expect(screen.getByText("/v1/projects")).toBeInTheDocument();
        expect(screen.getByText("/v1/secrets/:id")).toBeInTheDocument();
      });
    });
  });

  describe("EndpointList - fallback on API failure", () => {
    it("shows fallback endpoints when /docs/endpoints fails", async () => {
      mockApi.get.mockImplementation(async (path: string) => {
        if (path === "/health") {
          return { status: "ok" } as { status: string };
        }
        if (path === "/docs/endpoints") {
          throw new ApiError(404, "Not Found");
        }
        throw new Error("Unknown path");
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Health check")).toBeInTheDocument();
      });
      expect(screen.getByText("Register a new user")).toBeInTheDocument();
      expect(screen.getByText("Authenticate user")).toBeInTheDocument();
      expect(screen.getByText("Clear auth session")).toBeInTheDocument();
    });

    it("renders fallback endpoint paths", async () => {
      mockApi.get.mockImplementation(async (path: string) => {
        if (path === "/health") {
          return { status: "ok" } as { status: string };
        }
        if (path === "/docs/endpoints") {
          throw new Error("Failed");
        }
        throw new Error("Unknown path");
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText("/v1/health")).toBeInTheDocument();
        expect(screen.getByText("/v1/auth/register")).toBeInTheDocument();
        expect(screen.getByText("/v1/auth/login")).toBeInTheDocument();
      });
    });
  });
});
