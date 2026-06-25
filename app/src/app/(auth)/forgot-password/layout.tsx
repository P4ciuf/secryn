import type { Metadata } from "next";

/**
 * Layout for the forgot-password route segment.
 *
 * Exports page-level metadata that tells search engines not to index or
 * follow any page under this segment (noindex, nofollow). The layout
 * itself is a transparent pass-through — it only carries metadata.
 */
export const metadata: Metadata = {
  title: "Reset Password",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
