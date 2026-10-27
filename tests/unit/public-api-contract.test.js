import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const parseJson = (path) => JSON.parse(read(path));

const preview = read("src/components/dataset-resource-preview.jsx");
const apiDocs = read("src/app/(public)/api-data/page.jsx");
const controller = read(
  "backend/app/Http/Controllers/Api/PublicDataController.php",
);
const openapi = parseJson("backend/openapi/openapi.json");
const siteConfig = read("src/lib/site-config.js");
const organizations = read("src/lib/data/organizations.js");
const sitemap = read("src/app/sitemap.js");
const indicatorDetail = read("src/app/(public)/statistik/[slug]/page.jsx");

describe("public frontend and API contract regression guard", () => {
  it("renders the canonical row payload and both supported column schema shapes", () => {
    expect(preview).toContain("row.row ?? row.values ?? row");
    expect(preview).toContain('typeof column === "string"');
    expect(preview).toContain("rowData?.[column.name]");
    expect(controller).toContain("json_decode($row->row_data, true)");
  });

  it("paginates stored preview rows rather than overstating the source dataset count", () => {
    expect(controller).toContain("where('resource_id', $resourceId)->count()");
    expect(controller).toContain("page_out_of_range");
    expect(
      openapi.paths["/api/v1/datasets/{slug}/resources/{resourceId}/rows"].get
        .responses["400"],
    ).toBeTruthy();
  });

  it("keeps public API documentation aligned with implemented downloads and organization routes", () => {
    expect(apiDocs).toContain("/api/v1/organizations/{slug}");
    expect(apiDocs).toContain("/api/openapi.yaml");
    expect(apiDocs).not.toContain('"302 Found"');
    expect(openapi.paths["/api/v1/organizations/{slug}"].get).toBeTruthy();
    expect(openapi.paths["/api/openapi.json"].get).toBeTruthy();
    expect(openapi.paths["/api/openapi.yaml"].get).toBeTruthy();
  });

  it("does not silently truncate the public organization directory at the first API page", () => {
    expect(organizations).toContain(
      "/api/v1/organizations?limit=${pageSize}&page=${page}",
    );
    expect(organizations).toContain("rawLastPage");
    expect(organizations).toContain("Promise.all(batch.map(fetchPage))");
  });

  it("includes public indicator detail pages in sitemap discovery and structured metadata", () => {
    expect(sitemap).toContain("getSitemapIndicators");
    expect(sitemap).toContain("/statistik/${item.slug}");
    expect(indicatorDetail).toContain('"@type": "Dataset"');
    expect(indicatorDetail).toContain("serializeJsonLd(indicatorJsonLd)");
  });

  it("gives public pages shared social image metadata", () => {
    expect(siteConfig).toContain("getSocialMetadata");
    expect(siteConfig).toContain("summary_large_image");
    expect(siteConfig).toContain("wajo-hero-panorama.webp");
  });
});
