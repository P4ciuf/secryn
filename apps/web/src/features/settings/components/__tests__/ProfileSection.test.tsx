import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileSection } from "@/features/settings/components/ProfileSection";

describe("<ProfileSection />", () => {
  it("should render the section heading", () => {
    render(<ProfileSection />);
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });

  it("should render Full Name and Email inputs with default values", () => {
    render(<ProfileSection />);
    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
  });

  it("should render Save Changes button", () => {
    render(<ProfileSection />);
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });
});
