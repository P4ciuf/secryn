import type { Metadata } from "next";

/**
 * Layout for the verify route segment.
 *
 * Sets the page title to "Verify Account" and prevents search engines from
 * indexing or following any page under this segment. The layout is a
 * transparent pass-through that only carries segment-level metadata.
 */
export const metadata: Metadata = {
  title: "Verify Account",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
