import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicController = readFileSync(
  new URL("../../backend/app/Http/Controllers/Api/PublicDataController.php", import.meta.url),
  "utf8",
);
const organizationDirectory = readFileSync(
  new URL("../../src/components/organization-directory.jsx", import.meta.url),
  "utf8",
);
const organizationPage = readFileSync(
  new URL("../../src/app/(public)/organisasi/page.jsx", import.meta.url),
  "utf8",
);
const homePage = readFileSync(
  new URL("../../src/app/(public)/page.jsx", import.meta.url),
  "utf8",
);
const publicData = readFileSync(
  new URL("../../src/lib/data/public.js", import.meta.url),
  "utf8",
);
const organizationData = readFileSync(
  new URL("../../src/lib/data/organizations.js", import.meta.url),
  "utf8",
);
const cacheInvalidation = readFileSync(
  new URL("../../src/lib/data/revalidate-public.js", import.meta.url),
  "utf8",
);

describe("public portal statistics and organization directory", () => {
  it("uses the Laravel public API to count only published and currently public data", () => {
    expect(publicController).toContain("function stats()");
    expect(publicController).toContain("published_dataset_count");
    expect(publicController).toContain("public_organization_count");
    expect(publicController).toContain("published_indicator_count");
    expect(publicController).toContain("where('r.is_public', true)");
    expect(publicController).toContain("where('r.conversion_status', 'succeeded')");
    expect(publicController).toContain("where('o.is_active', true)");
    expect(publicController).toContain("DB::table('organizations')->where('is_active', true)->count()");
  });

  it("returns per-organization dataset counts for the searchable public directory", () => {
    expect(publicController).toContain("function organizations(Request $request)");
    expect(publicController).toContain("count(distinct d.id)");
    expect(organizationDirectory).toMatch(
      /organization\.name,\s*organization\.code,\s*organization\.description/,
    );
    expect(organizationDirectory).toContain("dataset publik");
    expect(organizationDirectory).toMatch(
      /\[organization\.name,\s*organization\.code,\s*organization\.description\]/,
    );
  });

  it("renders database-backed portal counts without inventing fallback values", () => {
    expect(homePage).toContain("getPublicPortalStatsResult()");
    expect(homePage).toContain("statsResult.unavailable");
    expect(homePage).toContain("displayStat(stats?.datasets)");
    expect(homePage).toContain("displayStat(stats?.organizations)");
    expect(homePage).toContain("displayStat(stats?.indicators)");
    expect(homePage).toMatch(
      /value === null \|\| value === undefined[\s\S]{0,80}"—"/,
    );
  });

  it("keeps public aggregate totals fresh after dataset, indicator, and organization mutations", () => {
    expect(publicData).toContain("data: await queryPublicPortalStats()");
    expect(publicData).not.toContain("getCachedPublicPortalStats");
    expect(organizationData).not.toContain("unstable_cache");
    expect(homePage).toContain("await connection();");
    expect(organizationPage).toContain("await connection();");
    expect(cacheInvalidation).toContain('revalidatePath("/", "page")');
    expect(cacheInvalidation).toContain('revalidatePath("/dataset", "page")');
    expect(cacheInvalidation).toContain(
      'revalidatePath("/organisasi", "page")',
    );
    expect(cacheInvalidation).toContain('revalidatePath("/statistik", "page")');
    expect(cacheInvalidation).toContain('expireTag("public-indicators")');
  });

  it("excludes a non-public or unsuccessfully converted resource from the public catalog", () => {
    expect(publicController).toContain("whereColumn('dataset_resources.dataset_version', 'datasets.current_version')");
    expect(publicController).toContain("where('is_public', true)");
    expect(publicController).toContain("where('conversion_status', 'succeeded')");
    expect(publicController).toContain("where('published_at', '<=', now())");
    expect(publicController).toContain("function serializeDataset($dataset, bool $includeResources)");
  });
});
