import "server-only";
import { cache } from "react";
import { createPublicBackendClient } from "@/lib/backend/compat-server";

/**
 * Read the tiny revision row outside Next's persistent data cache. React cache
 * deduplicates this lookup within one server render only; later requests always
 * see the database's current revision.
 */
export const getPublicCatalogRevision = cache(async function getRevision() {
  const supabase = createPublicBackendClient();
  const { data, error } = await supabase
    .from("public_catalog_revision")
    .select("revision")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw error;
  if (data?.revision === null || data?.revision === undefined) {
    throw new Error("public_catalog_revision_unavailable");
  }
  return String(data.revision);
});
