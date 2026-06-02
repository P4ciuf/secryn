import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationsSection } from "@/features/settings/components/NotificationsSection";

describe("<NotificationsSection />", () => {
  it("should render the section heading", () => {
    render(<NotificationsSection />);
    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument();
  });

  it("should render all notification toggles", () => {
    render(<NotificationsSection />);
    expect(screen.getByText("Email Notifications")).toBeInTheDocument();
    expect(screen.getByText("Security Alerts")).toBeInTheDocument();
    expect(screen.getByText("Product Updates")).toBeInTheDocument();
  });

  it("should have email and security alerts checked by default", () => {
    render(<NotificationsSection />);
    const checkboxes = screen.getAllByRole("checkbox");

    const emailCheckbox = checkboxes.find((cb) =>
      cb.closest("label")?.textContent?.includes("Email Notifications"),
    );
    const securityCheckbox = checkboxes.find((cb) =>
      cb.closest("label")?.textContent?.includes("Security Alerts"),
    );
    const updatesCheckbox = checkboxes.find((cb) =>
      cb.closest("label")?.textContent?.includes("Product Updates"),
    );

    expect(emailCheckbox).toBeChecked();
    expect(securityCheckbox).toBeChecked();
    expect(updatesCheckbox).not.toBeChecked();
  });

  it("should toggle a notification setting on click", async () => {
    const user = userEvent.setup();
    render(<NotificationsSection />);

    const checkboxes = screen.getAllByRole("checkbox");
    const updatesCheckbox = checkboxes.find((cb) =>
      cb.closest("label")?.textContent?.includes("Product Updates"),
    );

    expect(updatesCheckbox).not.toBeChecked();
    if (updatesCheckbox) {
      await user.click(updatesCheckbox);
      expect(updatesCheckbox).toBeChecked();
    }
  });
});
