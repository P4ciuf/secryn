import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "@/components/ErrorBoundary";

const mockNavigate = vi.fn();
const mockReload = vi.fn();

vi.mock("react-router", () => ({
  useRouteError: vi.fn(),
  isRouteErrorResponse: (
    error: unknown,
  ): error is { status: number; statusText: string; data?: { message?: string } } =>
    typeof error === "object" && error !== null && "status" in error && "statusText" in error,
  useNavigate: () => mockNavigate,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useRouteError } = await import("react-router");

describe("<ErrorBoundary />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: { reload: mockReload },
      writable: true,
    });
  });

  it("should render the RouteErrorResponse details for a 404 error", () => {
    vi.mocked(useRouteError).mockReturnValue({
      status: 404,
      statusText: "Not Found",
      data: { message: "The page you are looking for does not exist." },
    });

    render(<ErrorBoundary />);

    expect(screen.getByText("404 Not Found")).toBeInTheDocument();
    expect(screen.getByText("The page you are looking for does not exist.")).toBeInTheDocument();
  });

  it("should render a fallback message when RouteErrorResponse has no data.message", () => {
    vi.mocked(useRouteError).mockReturnValue({ status: 500, statusText: "Internal Server Error" });

    render(<ErrorBoundary />);

    expect(screen.getByText("500 Internal Server Error")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
  });

  it("should render the error message for a plain Error instance", () => {
    vi.mocked(useRouteError).mockReturnValue(new Error("Network request failed"));

    render(<ErrorBoundary />);

    expect(screen.getByText("Unexpected Error")).toBeInTheDocument();
    expect(screen.getByText("Network request failed")).toBeInTheDocument();
  });

  it("should render the error message for a thrown string", () => {
    vi.mocked(useRouteError).mockReturnValue("Something broke!");

    render(<ErrorBoundary />);

    expect(screen.getByText("Unexpected Error")).toBeInTheDocument();
    expect(screen.getByText("Something broke!")).toBeInTheDocument();
  });

  it("should render a generic fallback for unknown error types", () => {
    vi.mocked(useRouteError).mockReturnValue(42);

    render(<ErrorBoundary />);

    expect(screen.getByText("Unexpected Error")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
  });

  it("should call navigate(-1) when Go Back button is clicked", async () => {
    vi.mocked(useRouteError).mockReturnValue(new Error("test"));
    const user = userEvent.setup();

    render(<ErrorBoundary />);

    await user.click(screen.getByRole("button", { name: "Go Back" }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("should call window.location.reload() when Retry button is clicked", async () => {
    vi.mocked(useRouteError).mockReturnValue(new Error("test"));
    const user = userEvent.setup();

    render(<ErrorBoundary />);

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mockReload).toHaveBeenCalledOnce();
  });
});
