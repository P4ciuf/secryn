import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ResetPasswordLayout, { metadata } from "../layout";

describe("ResetPasswordLayout", () => {
  it("renders children transparently", () => {
    render(
      <ResetPasswordLayout>
        <span data-testid="child">New password form</span>
      </ResetPasswordLayout>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("New password form")).toBeInTheDocument();
  });

  it("exports metadata with noindex nofollow robots directives", () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe("Set New Password");
    expect(metadata.robots).toBeDefined();
    expect(metadata.robots!.index).toBe(false);
    expect(metadata.robots!.follow).toBe(false);
    expect(metadata.robots!.googleBot).toBeDefined();
    expect(metadata.robots!.googleBot!.index).toBe(false);
    expect(metadata.robots!.googleBot!.follow).toBe(false);
  });
});
