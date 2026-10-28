import "server-only";
import { unstable_cache } from "next/cache";
import { backendFetch } from "@/lib/backend/server";

/**
 * Laravel owns SDI eligibility and registry validation. Consume its canonical
 * harvest endpoint instead of reconstructing relational joins in the frontend.
 */
async function loadLiveSdiPackages() {
  const [recordsPayload, statsPayload] = await Promise.all([
    backendFetch("/api/v1/sdi/data.json", { auth: false, cache: "no-store" }),
    backendFetch("/api/v1/public/stats", { auth: false, cache: "no-store" }),
  ]);
  if (!Array.isArray(recordsPayload))
    throw new Error("sdi_harvest_invalid_shape");
  const publishedCount = Number(statsPayload?.data?.published_dataset_count);
  if (!Number.isFinite(publishedCount) || publishedCount < 0) {
    throw new Error("sdi_catalog_stats_invalid_shape");
  }
  const packages = recordsPayload.map((record) => ({
    dataset: {
      id: record.id,
      code: record.code,
      slug: record.slug,
      title: record.title,
      description: record.description,
      source_name: record.source_name,
      organization_code: record.organization_code,
      geographic_scope: record.geographic_scope,
      update_frequency: record.update_frequency,
      last_data_updated_at: record.last_data_updated_at,
      updated_at: record.updated_at,
      published_at: record.published_at,
      unit: record.unit,
      status: "published",
      current_version: record.current_version,
    },
    metadata: {
      ddp_id: record.ddp_id,
      ddp_name: record.ddp_name,
      source_reference: record.source_reference,
      available_year: record.available_year,
      sds_code: record.sds_code,
      sds_type: record.sds_type,
      sds_version: record.sds_version,
      standard_concept: record.concept,
      standard_definition: record.definition,
      measurement: record.measurement,
      presentation_classification: record.presentation_classification || [],
      reference_code: record.reference_code,
      reference_code_version: record.reference_code_version,
      method_description: record.method,
    },
    resources: (record.resources || []).map((resource) => ({
      ...resource,
      original_filename: resource.filename,
      is_public: true,
      conversion_status: "succeeded",
    })),
    missingFields: [],
  }));
  return {
    error: null,
    packages,
    publishedCount,
    excludedCount: Math.max(0, publishedCount - packages.length),
  };
}

const cachedLivePackagesByRevision = unstable_cache(
  async (_revision) => loadLiveSdiPackages(),
  ["regional-sdi-harvestable-catalog"],
  { revalidate: 3600 },
);

export async function getSdiCatalogPackages() {
  try {
    const revisionPayload = await backendFetch("/api/v1/public/revision", {
      auth: false,
      cache: "no-store",
    });
    const revision = revisionPayload?.data?.revision;
    if (revision === null || revision === undefined || revision === "") {
      throw new Error("public_catalog_revision_unavailable");
    }
    return await cachedLivePackagesByRevision(String(revision));
  } catch (error) {
    // Do not amplify throttling, transport, or service failures by immediately
    // issuing two more API requests. Keep the explicit live fallback only for a
    // successful response whose revision contract is malformed/unavailable.
    if (Number.isFinite(Number(error?.status)) || error instanceof TypeError) {
      return { error, packages: [], publishedCount: 0, excludedCount: 0 };
    }
    try {
      return await loadLiveSdiPackages();
    } catch (fallbackError) {
      return {
        error: fallbackError,
        packages: [],
        publishedCount: 0,
        excludedCount: 0,
      };
    }
  }
}
