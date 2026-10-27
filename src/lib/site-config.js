export const siteConfig = {
  name: "Portal Satu Data Kabupaten Wajo",
  description:
    "Portal resmi untuk menemukan, memahami, dan menggunakan data publik Kabupaten Wajo.",
  shortName: "Satu Data Wajo",
  locale: "id-ID",
  timeZone: "Asia/Makassar",
};

/**
 * Return the canonical public origin. Production must explicitly configure an
 * HTTPS origin; localhost is a development-only fallback so deployment URLs
 * are never accidentally published as canonical links or password-reset URLs.
 */
export function getPublicSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) {
    return process.env.NODE_ENV === "production"
      ? null
      : "http://localhost:3000";
  }

  try {
    const url = new URL(configured);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/** Omit canonical links when the deployment origin is unknown. */
export function getCanonicalMetadata(pathname) {
  return getPublicSiteOrigin() ? { alternates: { canonical: pathname } } : {};
}

/** Consistent social previews for public routes. Child Open Graph metadata replaces
 * the parent object in Next.js, so every route that customizes Open Graph must
 * define its own image instead of relying on the root layout. */
export function getSocialMetadata({
  path = "/",
  title,
  description,
  type = "website",
}) {
  const origin = getPublicSiteOrigin();
  const image = "/wajo-hero-panorama.webp";
  const absolutePath = origin ? new URL(path, origin).toString() : undefined;
  return {
    openGraph: {
      locale: "id_ID",
      siteName: siteConfig.name,
      title,
      description,
      type,
      ...(absolutePath ? { url: absolutePath } : {}),
      images: [{ url: image, width: 2103, height: 748, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
