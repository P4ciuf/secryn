import type { Metadata } from "next";

/**
 * Layout for the reset-password route segment.
 *
 * Sets the page title to "Set New Password" and prevents search engines from
 * indexing or following any page under this segment (including sub-routes
 * like /reset-password/[token]). The layout is a transparent pass-through.
 */
export const metadata: Metadata = {
  title: "Set New Password",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
