import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DangerZoneSection } from "@/features/settings/components/DangerZoneSection";

describe("<DangerZoneSection />", () => {
  it("should render the section heading", () => {
    render(<DangerZoneSection />);
    expect(screen.getByRole("heading", { name: "Danger Zone" })).toBeInTheDocument();
  });

  it("should render the warning message", () => {
    render(<DangerZoneSection />);
    expect(
      screen.getByText("Once you delete your account, there is no going back. Please be certain."),
    ).toBeInTheDocument();
  });

  it("should render the Delete Account button", () => {
    render(<DangerZoneSection />);
    expect(screen.getByRole("button", { name: "Delete Account" })).toBeInTheDocument();
  });
});
