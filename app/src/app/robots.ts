import type { MetadataRoute } from "next";

/**
 * Generates /robots.txt for the Secryn site.
 *
 * Allows all crawlers to index public pages (/login, /register, /) while
 * disallowing /api/, /dashboard/, and auth-related paths. Blocks AI-training
 * crawlers (GPTBot, Claude, etc.) from scraping the entire site, with one
 * exception: Google-Extended is allowed so the site can appear in Google's
 * AI-powered search features.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://secryn.xyz";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/forgot-password", "/reset-password/"],
      },
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "ChatGPT-User",
        disallow: "/",
      },
      {
        userAgent: "anthropic-ai",
        disallow: "/",
      },
      {
        userAgent: "Claude-Web",
        disallow: "/",
      },
      {
        userAgent: "cohere-ai",
        disallow: "/",
      },
      {
        userAgent: "PerplexityBot",
        disallow: "/",
      },
      {
        userAgent: "CCBot",
        disallow: "/",
      },
      // Allow Google-Extended so the site can appear in Google's AI Overviews / SGE.
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
