import "server-only";
import { cache } from "react";
import { backendFetch } from "@/lib/backend/server";

function safeLimit(value, fallback = 24) {
  return Math.min(Math.max(Number(value) || fallback, 1), 100);
}

function paramsFromObject(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

async function queryPublishedDatasets(options = {}) {
  const {
    query = "", limit = 24, organizationId = null, category = null,
    sort = "updated", year = null, format = null, offset = 0, page: requestedPage = null,
  } = options;
  const perPage = safeLimit(limit);
  const normalizedQuery = typeof query === "string" ? query.trim().slice(0, 100) : "";
  const safeOffset = safeOffsetValue(offset);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 100000
    ? requestedPage
    : Math.floor(safeOffset / perPage) + 1;
  const search = paramsFromObject({
    q: normalizedQuery,
    category,
    organization_id: organizationId,
    sort: ["relevance", "updated", "title"].includes(sort) ? sort : "updated",
    year: Number.isInteger(year) ? year : null,
    format: ["csv", "xlsx", "pdf", "json", "geojson"].includes(format) ? format : null,
    per_page: perPage,
    page,
  });
  const payload = await backendFetch(`/api/v1/datasets?${search}`, { cache: "no-store", auth: false });
  if (!Array.isArray(payload?.data)) throw new Error("public_dataset_search_invalid_result");
  return {
    data: payload.data.map((dataset) => ({
      ...dataset,
      organizations: dataset.organizations || (dataset.organization_name ? {
        name: dataset.organization_name, slug: dataset.organization_slug,
      } : null),
    })),
    meta: payload.meta || null,
  };
}

function safeOffsetValue(value) {
  return Number.isSafeInteger(value) ? Math.max(0, Math.min(value, 100000)) : 0;
}

export async function getPublishedDatasetsResult(options = {}) {
  try {
    const result = await queryPublishedDatasets(options);
    return { data: result.data, meta: result.meta, unavailable: false };
  }
  catch (error) {
    console.error("public_dataset_catalog_unavailable", { code: error?.code || "unknown_error" });
    return { data: [], meta: null, unavailable: true };
  }
}

export async function getPublishedDatasets(options = {}) {
  return (await getPublishedDatasetsResult(options)).data;
}

async function queryPublishedDatasetFacets() {
  const payload = await backendFetch("/api/v1/public/facets", { cache: "no-store", auth: false });
  const facets = payload?.data;
  if (!facets || !Array.isArray(facets.categories) || !Array.isArray(facets.organizations) || !Array.isArray(facets.years)) {
    throw new Error("public_dataset_facets_invalid_shape");
  }
  return { categories: facets.categories, organizations: facets.organizations, years: facets.years };
}

export async function getPublishedDatasetFacetsResult() {
  try { return { data: await queryPublishedDatasetFacets(), unavailable: false }; }
  catch (error) {
    console.error("public_dataset_facets_unavailable", { code: error?.code || "unknown_error" });
    return { data: { categories: [], organizations: [], years: [] }, unavailable: true };
  }
}

async function queryPublishedDatasetBySlug(slug) {
  const payload = await backendFetch(`/api/v1/datasets/${encodeURIComponent(slug)}`, { cache: "no-store", auth: false });
  const dataset = payload?.data;
  if (!dataset || typeof dataset !== "object") return null;
  dataset.dataset_resources = (dataset.dataset_resources || []).filter((resource) =>
    Number(resource.dataset_version) === Number(dataset.current_version));
  return dataset;
}

export const getPublishedDatasetBySlugResult = cache(async function getPublishedDatasetBySlugResult(slug) {
  try { return { data: await queryPublishedDatasetBySlug(slug), unavailable: false }; }
  catch (error) {
    if (error?.status === 404) return { data: null, unavailable: false };
    console.error("public_dataset_detail_unavailable", { code: error?.code || "unknown_error" });
    return { data: null, unavailable: true };
  }
});

async function queryPublicPortalStats() {
  const payload = await backendFetch("/api/v1/public/stats", { cache: "no-store", auth: false });
  const stats = payload?.data;
  const rawCounts = [stats?.published_dataset_count, stats?.public_organization_count, stats?.published_indicator_count];
  const counts = rawCounts.map(Number);
  if (rawCounts.some((value) => value === null || value === undefined || value === "") || counts.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("public_portal_stats_invalid_shape");
  }
  return { datasets: counts[0], organizations: counts[1], indicators: counts[2] };
}

export async function getPublicPortalStatsResult() {
  try { return { data: await queryPublicPortalStats(), unavailable: false }; }
  catch (error) {
    console.error("public_portal_stats_unavailable", { code: error?.code || null });
    return { data: null, unavailable: true };
  }
}

async function queryPublishedIndicators(limit = 100, offset = 0, requestedPage = null) {
  const perPage = safeLimit(limit, 100);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 100000
    ? requestedPage
    : Math.floor(safeOffsetValue(offset) / perPage) + 1;
  const payload = await backendFetch(`/api/v1/indicators?${paramsFromObject({ limit: perPage, page })}`, { cache: "no-store", auth: false });
  if (!Array.isArray(payload?.data)) throw new Error("public_indicators_invalid_result");
  return { data: payload.data, meta: payload.meta || null };
}

export async function getPublishedIndicatorsResult({ limit = 100, offset = 0, page = null } = {}) {
  try {
    const result = await queryPublishedIndicators(limit, offset, page);
    return { data: result.data, meta: result.meta, unavailable: false };
  } catch (error) {
    console.error("public_indicators_unavailable", { code: error?.code || null });
    return { data: [], meta: null, unavailable: true };
  }
}
