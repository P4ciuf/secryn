import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Global viewport configuration: responsive scaling, dark theme colour,
 * and explicit dark colour scheme for browser UI chrome.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://secryn.xyz"),
  title: {
    default: "Secryn - Secure Secrets Management Platform",
    template: "%s | Secryn",
  },
  description:
    "Secryn is a self-hosted secrets management platform for teams. Store, share, and manage API keys, tokens, and credentials with AES-256 encryption, role-based access control, and audit logging.",
  keywords: [
    "secrets management",
    "API key management",
    "secret manager",
    "self-hosted secrets",
    "AES-256 encryption",
    "team secrets",
    "credential management",
    "environment variables",
    "developer security",
    "Secryn",
  ],
  authors: [{ name: "P4ciuf", url: "https://github.com/p4ciuf" }],
  creator: "Secryn",
  publisher: "Secryn",
  category: "Developer Tools",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Secryn",
    title: "Secryn - Secure Secrets Management Platform",
    description:
      "Secryn is a self-hosted secrets management platform for teams. Store, share, and manage API keys, tokens, and credentials with AES-256 encryption.",
    url: "https://secryn.xyz",
    locale: "en_US",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Secryn - Secure Secrets Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@secryn",
    creator: "@secryn",
    title: "Secryn - Secure Secrets Management Platform",
    description:
      "Self-hosted secrets management for teams. AES-256 encryption, RBAC, audit logging.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

/**
 * Root layout applying Geist fonts, antialiasing, and a dark gradient
 * background.
 *
 * Wraps every page in the App Router. Injects JSON-LD structured data
 * with three schema.org entities — {@link https://schema.org/Organization Organization},
 * {@link https://schema.org/WebSite WebSite}, and
 * {@link https://schema.org/SoftwareApplication SoftwareApplication} — to
 * improve Knowledge Graph signals for search engines that consume
 * structured data.
 *
 * @param children - The nested page content rendered inside the body.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://secryn.xyz/#organization",
        name: "Secryn",
        url: "https://secryn.xyz",
        description:
          "Self-hosted secrets management platform for teams. AES-256 encryption, RBAC, audit logging.",
        founder: {
          "@type": "Person",
          name: "P4ciuf",
          url: "https://github.com/p4ciuf",
        },
        sameAs: ["https://github.com/p4ciuf"],
      },
      {
        "@type": "WebSite",
        "@id": "https://secryn.xyz/#website",
        url: "https://secryn.xyz",
        name: "Secryn",
        publisher: { "@id": "https://secryn.xyz/#organization" },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://secryn.xyz/search?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://secryn.xyz/#software",
        name: "Secryn",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Linux, Docker, Kubernetes",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "Self-hosted secrets management platform with AES-256 encryption, RBAC, and audit logging.",
        url: "https://secryn.xyz",
      },
    ],
  };

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
        {children}
      </body>
    </html>
  );
}
