import { siteConfig } from "@/lib/site-config";
export const metadata = {
  title: {
    default: "Ruang pengelola",
    template: `%s | ${siteConfig.shortName}`,
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function PortalRouteLayout({ children }) {
  return children;
}
