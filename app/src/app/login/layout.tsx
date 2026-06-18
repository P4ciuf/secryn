import type { Metadata } from "next";

/**
 * Layout for the login route segment.
 *
 * Sets the page title to "Login" and prevents search engines from indexing
 * or following any page under this segment. Acts as a transparent
 * pass-through — its only role is carrying segment-level metadata.
 */
export const metadata: Metadata = {
  title: "Login",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
