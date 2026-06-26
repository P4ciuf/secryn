import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginLayout, { metadata } from "../layout";

describe("LoginLayout", () => {
  it("renders children transparently", () => {
    render(
      <LoginLayout>
        <span data-testid="child">Login form</span>
      </LoginLayout>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Login form")).toBeInTheDocument();
  });

  it("exports metadata with noindex nofollow robots directives", () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe("Login");
    expect(metadata.robots).toBeDefined();
    expect(metadata.robots!.index).toBe(false);
    expect(metadata.robots!.follow).toBe(false);
    expect(metadata.robots!.googleBot).toBeDefined();
    expect(metadata.robots!.googleBot!.index).toBe(false);
    expect(metadata.robots!.googleBot!.follow).toBe(false);
  });
});
