import "server-only";
import { portalData } from "@/lib/backend/portal-api";

/**
 * Return only registry records that are already verified and within their
 * validity window. The registry itself remains the authoritative source;
 * form options must never invent codes or infer validity from labels.
 */
export async function getVerifiedSdiRegistryOptions(
  today = new Date().toISOString().slice(0, 10),
) {
  const registry = await portalData("sdi/registry");
  const active = (item) =>
    item.status === "verified" &&
    (!item.valid_from || item.valid_from <= today) &&
    (!item.valid_until || item.valid_until >= today);
  return {
    standards: (registry?.standards || []).filter(active),
    referenceSystems: (registry?.systems || []).filter(active),
  };
}
