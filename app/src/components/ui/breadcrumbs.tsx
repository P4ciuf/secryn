import Link from "next/link";

/** A single breadcrumb segment. Set href to make it a link; omit it for the current page. */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Renders an accessible breadcrumb navigation with JSON-LD structured data
 * for search engine breadcrumb enrichment.
 *
 * Items with an `href` that are not the last in the list are rendered as
 * `<Link>` elements; the last item is always plain text (current page).
 *
 * @param props.items - Ordered list of breadcrumb segments.
 */
export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? `https://secryn.xyz${item.href}` : undefined,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-slate-600" aria-hidden="true">
                  /
                </span>
              )}
              {item.href && index < items.length - 1 ? ( // last item is never a link
                <Link href={item.href} className="hover:text-white transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={index === items.length - 1 ? "text-white font-medium" : ""}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
