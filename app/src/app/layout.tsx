import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Secryn",
  description: "Secure Your Secrets, Simplify Your Workflow",
};

/**
 * Root layout applying Geist fonts, antialiasing, and a dark gradient background.
 * Wraps every page in the App Router.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
        {children}
      </body>
    </html>
  );
}
