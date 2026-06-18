import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WebhooksPage from "../page";

describe("WebhooksPage", () => {
  it("renders the heading 'Webhooks'", () => {
    render(<WebhooksPage />);
    expect(screen.getByRole("heading", { name: "Webhooks" })).toBeInTheDocument();
  });
});
