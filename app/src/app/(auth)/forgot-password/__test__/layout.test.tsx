import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ForgotPasswordLayout, { metadata } from "../layout";

describe("ForgotPasswordLayout", () => {
  it("renders children transparently", () => {
    render(
      <ForgotPasswordLayout>
        <span data-testid="child">Reset form</span>
      </ForgotPasswordLayout>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Reset form")).toBeInTheDocument();
  });

  it("exports metadata with noindex nofollow robots directives", () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe("Reset Password");
    expect(metadata.robots).toBeDefined();
    expect(metadata.robots!.index).toBe(false);
    expect(metadata.robots!.follow).toBe(false);
    expect(metadata.robots!.googleBot).toBeDefined();
    expect(metadata.robots!.googleBot!.index).toBe(false);
    expect(metadata.robots!.googleBot!.follow).toBe(false);
  });
});
