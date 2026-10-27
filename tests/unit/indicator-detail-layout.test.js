import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const detail = read("src/app/(public)/statistik/[slug]/page.jsx");
const loadingPath = "src/app/(public)/statistik/[slug]/loading.jsx";
const loading = read(loadingPath);

describe("public indicator detail loading and responsive filters", () => {
  it("uses a route-specific loading layout instead of the statistics listing skeleton", () => {
    expect(existsSync(new URL(`../../${loadingPath}`, import.meta.url))).toBe(
      true,
    );
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Memuat detail indikator statistik.");
    expect(loading).toContain("public-page-heading");
    expect(loading).toContain("sm:grid-cols-2 xl:grid-cols-4");
    expect(loading).toContain("aspect-[800/270]");
    expect(loading).toContain("Periode</th>");
    expect(loading).toContain("Wilayah</th>");
    expect(loading).toContain("Dimensi</th>");
    expect(loading).toContain("Nilai</th>");
    expect(loading).toContain("Sumber</th>");
    expect(loading).toContain("Revisi</th>");
  });

  it("reserves space for summary values and uses bounded grid tracks for the filters", () => {
    expect(detail.match(/sm:min-h-\[92px\]/g)?.length).toBe(4);
    expect(detail).toContain("xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]");
    expect(
      detail.match(
        /className="field box-border block h-11 min-w-0 max-w-full w-full text-ellipsis"/g,
      )?.length,
    ).toBe(2);
    expect(detail).toContain("overflow-visible p-4");
    expect(detail).toContain('id="indicator-region"');
    expect(detail).toContain('id="indicator-dimension"');
  });

  it("keeps the loading chart and table within the same responsive width constraints", () => {
    expect(loading).toContain("aspect-[800/270]");
    expect(loading).toContain("overflow-x-auto");
    expect(loading).toContain("min-w-[760px]");
    expect(loading).not.toMatch(/w-\$\{/);
  });
});
