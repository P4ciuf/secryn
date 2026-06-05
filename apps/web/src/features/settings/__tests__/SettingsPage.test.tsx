import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsPage from "@/features/settings/SettingsPage";

vi.mock("@/components/common/PageHeader", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="mock-page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock("@/features/settings/components/ProfileSection", () => ({
  ProfileSection: () => <div data-testid="mock-profile-section">Profile</div>,
}));

vi.mock("@/features/settings/components/SecuritySection", () => ({
  SecuritySection: () => <div data-testid="mock-security-section">Security</div>,
}));

vi.mock("@/features/settings/components/MfaSection", () => ({
  MfaSection: () => <div data-testid="mock-mfa-section">MFA</div>,
}));

vi.mock("@/features/settings/components/DangerZoneSection", () => ({
  DangerZoneSection: () => <div data-testid="mock-dangerzone-section">Danger Zone</div>,
}));

describe("SettingsPage", () => {
  it("should render the page header", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Manage your account and preferences")).toBeInTheDocument();
  });

  it("should render all settings sections", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("mock-profile-section")).toBeInTheDocument();
    expect(screen.getByTestId("mock-security-section")).toBeInTheDocument();
    expect(screen.getByTestId("mock-mfa-section")).toBeInTheDocument();
    expect(screen.getByTestId("mock-dangerzone-section")).toBeInTheDocument();
  });
});
