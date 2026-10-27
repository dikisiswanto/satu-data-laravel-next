import { PublicLayout } from "@/components/public-layout";

// Public routes render on request so newly published or updated data is visible
// without waiting for a persistent Next.js cache to expire. Backend fetches use
// no-store; React cache only deduplicates repeated calls within one server render
// (for example, metadata and the page body). This favours freshness over minimum
// backend traffic. Add persistent caching only with tested publish/update
// invalidation and integration coverage.
export const dynamic = "force-dynamic";

export default function PublicRouteLayout({ children }) {
  return <PublicLayout>{children}</PublicLayout>;
}
