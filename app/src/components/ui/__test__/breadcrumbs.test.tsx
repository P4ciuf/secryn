import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Breadcrumbs, { type BreadcrumbItem } from "../breadcrumbs";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Breadcrumbs", () => {
  it("renders nothing inside the nav when items are empty", () => {
    render(<Breadcrumbs items={[]} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();
    expect(nav.querySelector("ol")?.children.length).toBe(0);
  });

  it("renders a single item as plain text (no link, last item)", () => {
    render(<Breadcrumbs items={[{ label: "Dashboard" }]} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders two items with a separator and the first as a link", () => {
    const items: BreadcrumbItem[] = [
      { label: "Projects", href: "/dashboard/projects" },
      { label: "My Project" },
    ];

    render(<Breadcrumbs items={items} />);

    const link = screen.getByRole("link", { name: "Projects" });
    expect(link).toHaveAttribute("href", "/dashboard/projects");

    expect(screen.getByText("My Project")).toBeInTheDocument();
  });

  it("renders three items with correct structure", () => {
    const items: BreadcrumbItem[] = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Projects", href: "/dashboard/projects" },
      { label: "Secrets" },
    ];

    render(<Breadcrumbs items={items} />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/dashboard/projects",
    );
    expect(screen.getByText("Secrets")).toBeInTheDocument();

    const separators = screen.getAllByText("/");
    expect(separators.length).toBe(2);
  });

  it("renders JSON-LD structured data with correct schema", () => {
    const items: BreadcrumbItem[] = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings" },
    ];

    const { container } = render(<Breadcrumbs items={items} />);

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();

    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("BreadcrumbList");
    expect(jsonLd.itemListElement).toHaveLength(2);
    expect(jsonLd.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Dashboard",
      item: "https://secryn.xyz/dashboard",
    });
    expect(jsonLd.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Settings",
      item: undefined,
    });
  });
});
