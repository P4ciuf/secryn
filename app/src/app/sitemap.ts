import type { MetadataRoute } from "next";

/**
 * Generates /sitemap.xml for the Secryn site.
 *
 * Only public, indexable pages are included: the landing page (priority 1,
 * weekly recrawl) and the auth entry points (login, register) at low
 * priority. Dashboard, API routes, and token-bearing reset-password pages
 * are intentionally excluded since they are noindexed or require
 * authentication.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://secryn.xyz";

  const publicRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.1,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.1,
    },
  ];

  return publicRoutes;
}
