import { getPublicSiteOrigin } from "@/lib/site-config";

export default function robots() {
  const base = getPublicSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        // Portal routes are private workflow surfaces: prevent routine crawling
        // and rely on authentication/authorization as the actual security boundary.
        allow: [
          "/",
          "/dataset",
          "/statistik",
          "/organisasi",
          "/bantuan",
          "/api-data",
        ],
        disallow: ["/api/", "/portal", "/portal/"],
      },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
