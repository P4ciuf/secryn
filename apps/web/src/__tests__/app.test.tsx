import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App.tsx";

describe("App", () => {
  it("renders the heading", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, World!");
  });

  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });
});
