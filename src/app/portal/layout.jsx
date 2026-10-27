export const metadata = {
  title: {
    default: "Ruang pengelola",
    template: "%s | Portal Satu Data",
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
