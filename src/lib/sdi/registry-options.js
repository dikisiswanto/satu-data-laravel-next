import "server-only";
import { assertBackendQuery } from "@/lib/backend/query-guard";

/**
 * Return only registry records that are already verified and within their
 * validity window. The registry itself remains the authoritative source;
 * form options must never invent codes or infer validity from labels.
 */
export async function getVerifiedSdiRegistryOptions(
  backendQuery,
  today = new Date().toISOString().slice(0, 10),
) {
  const [standardsResult, systemsResult] = await Promise.all([
    backendQuery
      .from("sdi_standard_registry")
      .select(
        "id,standard_code,standard_type,title,version_label,status,valid_from,valid_until",
      )
      .eq("status", "verified")
      .order("title", { ascending: true })
      .limit(500),
    backendQuery
      .from("reference_code_systems")
      .select(
        "id,system_code,title,version_label,status,valid_from,valid_until",
      )
      .eq("status", "verified")
      .order("title", { ascending: true })
      .limit(500),
  ]);
  assertBackendQuery(standardsResult.error, "sdi_verified_standard_options");
  assertBackendQuery(
    systemsResult.error,
    "sdi_verified_reference_system_options",
  );
  const active = (item) =>
    (!item.valid_from || item.valid_from <= today) &&
    (!item.valid_until || item.valid_until >= today);
  return {
    standards: (standardsResult.data || []).filter(active),
    referenceSystems: (systemsResult.data || []).filter(active),
  };
}
