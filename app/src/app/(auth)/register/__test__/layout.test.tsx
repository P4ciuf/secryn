import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RegisterLayout, { metadata } from "../layout";

describe("RegisterLayout", () => {
  it("renders children transparently", () => {
    render(
      <RegisterLayout>
        <span data-testid="child">Register form</span>
      </RegisterLayout>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Register form")).toBeInTheDocument();
  });

  it("exports metadata with noindex nofollow robots directives", () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe("Create Account");
    expect(metadata.robots).toBeDefined();
    expect(metadata.robots!.index).toBe(false);
    expect(metadata.robots!.follow).toBe(false);
    expect(metadata.robots!.googleBot).toBeDefined();
    expect(metadata.robots!.googleBot!.index).toBe(false);
    expect(metadata.robots!.googleBot!.follow).toBe(false);
  });
});
