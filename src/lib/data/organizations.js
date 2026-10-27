import "server-only";
import { cache } from "react";
import { backendFetch } from "@/lib/backend/server";

async function queryPublicOrganizations() {
  const pageSize = 100;
  const maxPages = 100;
  const fetchPage = async (page) => {
    const payload = await backendFetch(
      `/api/v1/organizations?limit=${pageSize}&page=${page}`,
      { cache: "no-store", auth: false },
    );
    if (!Array.isArray(payload?.data)) {
      throw new Error("public_organization_catalog_invalid_result");
    }
    return payload;
  };

  const first = await fetchPage(1);
  const rawLastPage = Number(first?.meta?.last_page ?? 1);
  if (
    !Number.isSafeInteger(rawLastPage) ||
    rawLastPage < 1 ||
    rawLastPage > maxPages
  ) {
    throw new Error("public_organization_page_bound_exceeded");
  }

  const pages = [first];
  // Fetch in small batches: do not silently truncate directories at 100 entries,
  // but also avoid launching hundreds of internal API requests at once.
  for (let start = 2; start <= rawLastPage; start += 5) {
    const batch = Array.from(
      { length: Math.min(5, rawLastPage - start + 1) },
      (_, index) => start + index,
    );
    pages.push(...(await Promise.all(batch.map(fetchPage))));
  }

  const organizations = pages.flatMap((payload) => payload.data);
  const seenIds = new Set();
  return organizations.map((organization) => {
    if (!organization?.id || seenIds.has(organization.id)) {
      throw new Error("public_organization_catalog_duplicate_or_missing_id");
    }
    seenIds.add(organization.id);
    const rawCount =
      organization.dataset_count ?? organization.published_dataset_count;
    const datasetCount = Number(rawCount);
    if (!Number.isFinite(datasetCount) || datasetCount < 0) {
      throw new Error("public_organization_dataset_count_invalid");
    }
    // Laravel's canonical field is published_dataset_count; the UI uses the
    // shorter dataset_count property across public organization cards.
    return { ...organization, dataset_count: datasetCount };
  });
}

export async function getPublicOrganizationsResult() {
  try {
    return { data: await queryPublicOrganizations(), unavailable: false };
  } catch (error) {
    console.error(
      "public_organization_query_failed",
      error?.code || "unknown_error",
    );
    return { data: [], unavailable: true };
  }
}

export async function getPublicOrganizations() {
  return (await getPublicOrganizationsResult()).data;
}

export const getPublicOrganizationBySlugResult = cache(
  async function getOrganizationBySlug(slug) {
    const safeSlug =
      typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)
        ? slug.slice(0, 120)
        : "";
    if (!safeSlug) return { data: null, unavailable: false };
    try {
      const payload = await backendFetch(
        `/api/v1/organizations/${encodeURIComponent(safeSlug)}`,
        { cache: "no-store", auth: false },
      );
      const organization = payload?.data;
      if (
        !organization ||
        typeof organization !== "object" ||
        organization.slug !== safeSlug
      ) {
        throw new Error("public_organization_detail_invalid_result");
      }
      const rawCount =
        organization.dataset_count ?? organization.published_dataset_count;
      const datasetCount = Number(rawCount);
      if (!Number.isFinite(datasetCount) || datasetCount < 0) {
        throw new Error("public_organization_dataset_count_invalid");
      }
      return {
        data: { ...organization, dataset_count: datasetCount },
        unavailable: false,
      };
    } catch (error) {
      if (error?.status === 404) return { data: null, unavailable: false };
      console.error(
        "public_organization_detail_failed",
        error?.code || "unknown_error",
      );
      return { data: null, unavailable: true };
    }
  },
);
