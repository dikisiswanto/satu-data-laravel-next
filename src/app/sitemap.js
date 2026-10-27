import { getPublicSiteOrigin } from "@/lib/site-config";
import { getPublishedDatasetsResult, getPublishedIndicatorsResult } from "@/lib/data/public";
import { getPublicOrganizationsResult } from "@/lib/data/organizations";
import { connection } from "next/server";

export const dynamic = "force-dynamic";
const SITEMAP_URL_LIMIT = 50_000;
const DATASET_PAGE_SIZE = 100;
const INDICATOR_PAGE_SIZE = 100;

function validDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getSitemapDatasets() {
  const datasets = [];
  let unavailable = false;
  // The public search RPC caps each response at 100 rows. Paginate explicitly
  // so a growing catalog is not silently omitted from SEO discovery.
  for (
    let offset = 0;
    offset < SITEMAP_URL_LIMIT;
    offset += DATASET_PAGE_SIZE
  ) {
    const result = await getPublishedDatasetsResult({
      limit: DATASET_PAGE_SIZE,
      offset,
      sort: "updated",
    });
    if (result.unavailable) {
      unavailable = true;
      console.error("sitemap_dataset_catalog_incomplete", { offset });
      break;
    }
    const batch = result.data || [];
    datasets.push(...batch);
    if (batch.length < DATASET_PAGE_SIZE) break;
  }
  return { data: datasets.slice(0, SITEMAP_URL_LIMIT), unavailable };
}

async function getSitemapIndicators() {
  const indicators = [];
  let unavailable = false;
  // Indicator details are public landing pages too; include them so crawlers do
  // not depend on discovering them through client-side links from the index.
  for (let offset = 0; offset < SITEMAP_URL_LIMIT; offset += INDICATOR_PAGE_SIZE) {
    const result = await getPublishedIndicatorsResult({ limit: INDICATOR_PAGE_SIZE, offset });
    if (result.unavailable) {
      unavailable = true;
      console.error("sitemap_indicator_catalog_incomplete", { offset });
      break;
    }
    const batch = result.data || [];
    indicators.push(...batch);
    if (batch.length < INDICATOR_PAGE_SIZE) break;
  }
  return { data: indicators.slice(0, SITEMAP_URL_LIMIT), unavailable };
}

export default async function sitemap() {
  const base = getPublicSiteOrigin();
  if (!base) {
    console.error("sitemap_unavailable_site_origin_not_configured");
    return [];
  }
  const [datasetResult, indicatorResult, organizationResult] = await Promise.all([
    getSitemapDatasets(),
    getSitemapIndicators(),
    getPublicOrganizationsResult(),
  ]);
  // Avoid caching a partial sitemap as complete while any public query is failing.
  if (datasetResult.unavailable || indicatorResult.unavailable || organizationResult.unavailable)
    await connection();
  const datasets = datasetResult.data;
  const indicators = indicatorResult.data;
  const organizations = organizationResult.data;
  const fixed = [
    "",
    "/dataset",
    "/statistik",
    "/organisasi",
    "/bantuan",
    "/api-data",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "daily",
    priority: path === "" ? 1 : 0.7,
  }));
  const datasetEntries = datasets.map((item) => ({
    url: `${base}/dataset/${item.slug}`,
    ...(validDate(item.updated_at || item.published_at)
      ? { lastModified: validDate(item.updated_at || item.published_at) }
      : {}),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const organizationEntries = organizations.map((item) => ({
    url: `${base}/organisasi/${item.slug}`,
    ...(validDate(item.updated_at)
      ? { lastModified: validDate(item.updated_at) }
      : {}),
    changeFrequency: "monthly",
    priority: 0.5,
  }));
  const indicatorEntries = indicators.map((item) => ({
    url: `${base}/statistik/${item.slug}`,
    ...(validDate(item.updated_at || item.published_at)
      ? { lastModified: validDate(item.updated_at || item.published_at) }
      : {}),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  // Preserve room for fixed pages, organizations and indicators within the
  // sitemap protocol's 50,000-URL ceiling; datasets fill the remaining capacity.
  const roomForDatasets = Math.max(
    0,
    SITEMAP_URL_LIMIT - fixed.length - organizationEntries.length - indicatorEntries.length,
  );
  return [
    ...fixed,
    ...datasetEntries.slice(0, roomForDatasets),
    ...organizationEntries,
    ...indicatorEntries,
  ].slice(0, SITEMAP_URL_LIMIT);
}
