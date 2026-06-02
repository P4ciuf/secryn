import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "@/features/dashboard/components/TopBar";

describe("<TopBar />", () => {
  it("should render a menu button", () => {
    const onMenuClick = vi.fn();
    render(<TopBar onMenuClick={onMenuClick} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should call onMenuClick when the button is clicked", async () => {
    const onMenuClick = vi.fn();
    const user = userEvent.setup();
    render(<TopBar onMenuClick={onMenuClick} />);

    await user.click(screen.getByRole("button"));
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });
});
