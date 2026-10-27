import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { QueryProvider } from "@/components/query-provider";
import { PortalQueryCacheGuard } from "@/components/portal-query-cache-guard";
import { RouteProgress } from "@/components/route-progress";
import { getPublicSiteOrigin, siteConfig } from "@/lib/site-config";
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
const siteUrl = getPublicSiteOrigin();
export const metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "Portal Satu Data Kabupaten Wajo",
    template: "%s | Satu Data Wajo",
  },
  description:
    "Portal resmi untuk menemukan, memahami, dan menggunakan data publik Kabupaten Wajo.",
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Satu Data Wajo",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  category: "government",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Portal Satu Data Kabupaten Wajo",
    title: "Portal Satu Data Kabupaten Wajo",
    description: "Portal resmi untuk menemukan, memahami, dan menggunakan data publik Kabupaten Wajo.",
    images: [{ url: "/wajo-hero-panorama.webp", width: 2103, height: 748, alt: "Portal Satu Data Kabupaten Wajo" }],
  },
  twitter: { card: "summary_large_image", title: "Portal Satu Data Kabupaten Wajo", description: "Portal resmi data publik Kabupaten Wajo.", images: ["/wajo-hero-panorama.webp"] },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};
export default function RootLayout({ children }) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body className={inter.variable}>
        <ServiceWorkerRegistration />
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <a className="skip-link" href="#konten-utama">
          Lewati ke konten utama
        </a>
        <QueryProvider>
          <PortalQueryCacheGuard />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
