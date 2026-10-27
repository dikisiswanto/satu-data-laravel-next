import { siteConfig } from "@/lib/site-config";

export default function manifest() {
  return {
    id: "/",
    name: siteConfig.name,
    short_name: "Satu Data Wajo",
    description: siteConfig.description,
    lang: "id-ID",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f4f6f8",
    theme_color: "#174566",
    categories: ["government", "education", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
