import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans", subsets: ["latin"] }),
  Geist_Mono: () => ({ variable: "--font-geist-mono", subsets: ["latin"] }),
}));

vi.mock("./globals.css", () => ({}));

import RootLayout, { metadata, viewport } from "../layout";

describe("RootLayout", () => {
  it("renders children inside the body", () => {
    render(
      <RootLayout>
        <div data-testid="child">Hello</div>
      </RootLayout>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders the html element with lang=en and font variables", () => {
    render(<RootLayout>content</RootLayout>);

    const html = document.documentElement;
    expect(html).toHaveAttribute("lang", "en");
    expect(html.className).toContain("antialiased");
  });

  it("renders the JSON-LD structured data script", () => {
    render(<RootLayout>content</RootLayout>);

    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();

    const json = JSON.parse(script!.textContent ?? "{}") as Record<string, unknown>;
    expect(json["@context"]).toBe("https://schema.org");

    const graph = json["@graph"] as Array<Record<string, unknown>>;
    expect(graph).toHaveLength(3);

    const org = graph.find((item) => item["@type"] === "Organization");
    expect(org).toBeDefined();
    expect(org?.name).toBe("Secryn");
  });

  it("applies the dark gradient body class", () => {
    render(<RootLayout>content</RootLayout>);

    const body = document.body;
    expect(body.className).toContain("bg-linear-to-b");
    expect(body.className).toContain("from-slate-900");
    expect(body.className).toContain("text-white");
  });
});

describe("RootLayout metadata", () => {
  it("exports viewport with dark theme and responsive scaling", () => {
    expect(viewport).toBeDefined();
    expect(viewport.width).toBe("device-width");
    expect(viewport.initialScale).toBe(1);
    expect(viewport.themeColor).toBe("#0f172a");
    expect(viewport.colorScheme).toBe("dark");
  });

  it("exports metadata with title template and description", () => {
    expect(metadata).toBeDefined();
    expect(metadata.metadataBase).toEqual(new URL("https://secryn.xyz"));
    expect(metadata.title).toEqual({
      default: "Secryn - Secure Secrets Management Platform",
      template: "%s | Secryn",
    });
    expect(metadata.description).toContain("AES-256 encryption");
  });

  it("exports OpenGraph metadata with correct values", () => {
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph!.type).toBe("website");
    expect(metadata.openGraph!.siteName).toBe("Secryn");
    expect(metadata.openGraph!.url).toBe("https://secryn.xyz");
    expect(metadata.openGraph!.locale).toBe("en_US");
    expect(metadata.openGraph!.images).toBeDefined();
    expect(metadata.openGraph!.images![0]).toMatchObject({
      url: "/logo.png",
      width: 1200,
      height: 630,
    });
  });

  it("exports Twitter card metadata", () => {
    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter!.card).toBe("summary_large_image");
    expect(metadata.twitter!.site).toBe("@secryn");
  });

  it("exports robots metadata allowing indexing", () => {
    expect(metadata.robots).toBeDefined();
    expect(metadata.robots!.index).toBe(true);
    expect(metadata.robots!.follow).toBe(true);
    expect(metadata.robots!.googleBot).toBeDefined();
    expect(metadata.robots!.googleBot!.index).toBe(true);
    expect(metadata.robots!.googleBot!.follow).toBe(true);
  });

  it("exports icons pointing to logo.png", () => {
    expect(metadata.icons).toBeDefined();
    expect(metadata.icons!.icon).toBe("/logo.png");
    expect(metadata.icons!.apple).toBe("/logo.png");
  });
});
