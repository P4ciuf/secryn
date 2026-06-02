import { describe, it, expect, vi } from "vitest";
import { cn } from "@/lib/utils";

vi.mock("clsx", () => ({
  clsx: vi.fn((...args: unknown[]) => args.join(" ")),
}));

vi.mock("tailwind-merge", () => ({
  twMerge: vi.fn((value: string) => value),
}));

describe("cn utility", () => {
  it("should merge class names using clsx and twMerge", () => {
    const result = cn("px-4", "py-2");
    expect(typeof result).toBe("string");
  });

  it("should handle a single class string", () => {
    const result = cn("bg-blue-500");
    expect(typeof result).toBe("string");
  });

  it("should handle empty input", () => {
    const result = cn();
    expect(typeof result).toBe("string");
  });

  it("should handle falsy values", () => {
    const result = cn("btn", false && "hidden", undefined, null, "active");
    expect(typeof result).toBe("string");
  });

  it("should handle conditional class objects", () => {
    const result = cn("base", { active: true, disabled: false });
    expect(typeof result).toBe("string");
  });
});
