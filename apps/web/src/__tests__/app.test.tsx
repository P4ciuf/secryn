import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { ComponentType } from "react";
import Landing from "@/pages/Landing";

function renderWithRouter(Comp: ComponentType) {
  const router = createMemoryRouter([{ path: "/", Component: Comp }], { initialEntries: ["/"] });
  return render(<RouterProvider router={router} />);
}

describe("Landing", () => {
  it("renders the hero heading", () => {
    renderWithRouter(Landing);
    expect(screen.getByText("Secure Your Secrets, Simplify Your Workflow")).toBeInTheDocument();
  });

  it("renders the navbar with Get Started link", () => {
    renderWithRouter(Landing);
    const links = screen.getAllByText("Get Started");
    expect(links.length).toBeGreaterThanOrEqual(1);
  });
});
