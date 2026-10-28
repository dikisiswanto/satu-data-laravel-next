import "server-only";
import { cache } from "react";
import { backendFetch } from "@/lib/backend/server";

/**
 * Read the tiny revision row outside Next's persistent data cache. React cache
 * deduplicates this lookup within one server render only; later requests always
 * see the database's current revision.
 */
export const getPublicCatalogRevision = cache(async function getRevision() {
  const payload = await backendFetch("/api/v1/public/revision", {
    auth: false,
  });
  const revision = payload?.data?.revision;
  if (revision === null || revision === undefined) {
    throw new Error("public_catalog_revision_unavailable");
  }
  return String(revision);
});
