import type { Metadata } from "next";

/**
 * Layout for the register route segment.
 *
 * Sets the page title to "Create Account" and prevents search engines from
 * indexing or following any page under this segment. The layout is a
 * transparent pass-through that only carries segment-level metadata.
 */
export const metadata: Metadata = {
  title: "Create Account",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
