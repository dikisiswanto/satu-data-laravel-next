import "server-only";
import { cache } from "react";
import { backendFetch } from "@/lib/backend/server";

function normalizeSlug(slug) {
  return typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)
    ? slug.slice(0, 120)
    : "";
}

export const getPublicIndicatorBySlugResult = cache(async function getIndicator(slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return { data: null, unavailable: false };
  try {
    const payload = await backendFetch(`/api/v1/indicators/${encodeURIComponent(safeSlug)}`, { cache: "no-store", auth: false });
    const indicator = payload?.data;
    if (!indicator || typeof indicator !== "object" || indicator.slug !== safeSlug) {
      throw new Error("public_indicator_detail_invalid_result");
    }
    return { data: indicator, unavailable: false };
  } catch (error) {
    if (error?.status === 404) return { data: null, unavailable: false };
    console.error("public_indicator_detail_unavailable", { code: error?.code || "unknown_error" });
    return { data: null, unavailable: true };
  }
});

export const getPublicIndicatorObservationsResult = cache(async function getObservations(slug, limit = 500) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return { data: [], unavailable: false };
  const normalizedLimit = Number.isSafeInteger(Number(limit))
    ? Math.min(500, Math.max(1, Number(limit)))
    : 500;
  try {
    const payload = await backendFetch(`/api/v1/indicators/${encodeURIComponent(safeSlug)}/observations?limit=${normalizedLimit}`, { cache: "no-store", auth: false });
    if (!Array.isArray(payload?.data)) throw new Error("public_indicator_observations_invalid_result");
    return { data: payload.data, meta: payload.meta || null, unavailable: false };
  } catch (error) {
    console.error("public_indicator_observations_unavailable", { code: error?.code || "unknown_error" });
    return { data: [], meta: null, unavailable: true };
  }
});
