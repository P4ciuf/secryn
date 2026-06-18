import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ApiDocsPage from "../page";

describe("ApiDocsPage", () => {
  it("renders the heading 'API Documentation'", () => {
    render(<ApiDocsPage />);
    expect(screen.getByRole("heading", { name: "API Documentation" })).toBeInTheDocument();
  });
});
