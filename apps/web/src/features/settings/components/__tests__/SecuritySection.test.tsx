import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecuritySection } from "@/features/settings/components/SecuritySection";

describe("<SecuritySection />", () => {
  it("should render the section heading", () => {
    render(<SecuritySection />);
    expect(screen.getByRole("heading", { name: "Security" })).toBeInTheDocument();
  });

  it("should render password fields", () => {
    render(<SecuritySection />);
    const passwordFields = screen.getAllByPlaceholderText("••••••••");
    expect(passwordFields).toHaveLength(3);
  });

  it("should render Update Password button", () => {
    render(<SecuritySection />);
    expect(screen.getByRole("button", { name: "Update Password" })).toBeInTheDocument();
  });
});
