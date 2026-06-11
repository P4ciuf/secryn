import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingFooter } from "../Footer";

describe("<LandingFooter />", () => {
  it("should render the copyright text", () => {
    render(<LandingFooter />);
    expect(screen.getByText(/2026 Secryn/)).toBeInTheDocument();
  });

  it("should render the tagline", () => {
    render(<LandingFooter />);
    expect(screen.getByText(/Built with security in mind/)).toBeInTheDocument();
  });

  it("should render as a footer element", () => {
    const { container } = render(<LandingFooter />);
    expect(container.querySelector("footer")).toBeInTheDocument();
  });

  it("should be centered", () => {
    const { container } = render(<LandingFooter />);
    const inner = container.querySelector(".text-center");
    expect(inner).toBeInTheDocument();
  });
});
