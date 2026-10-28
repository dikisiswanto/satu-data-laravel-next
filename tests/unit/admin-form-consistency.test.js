import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin form consistency and user-facing guidance", () => {
  const styles = read("src/app/styles/overrides.css");
  const explorerStyles = read("src/app/styles/admin-table-explorer.css");

  it("uses one shared 44px baseline for single-line admin controls", () => {
    expect(styles).toMatch(/height:\s*44px/);
    expect(styles).toMatch(/min-height:\s*44px/);
    expect(styles).toMatch(/font-size:\s*0\.875rem/);
    expect(styles).toMatch(/portal-main form label\[for\]/);
  });

  it("keeps the icon search input borderless so only its wrapper is outlined", () => {
    expect(styles).toMatch(
      /\.portal-app \.portal-filter-search > \.relative\s*\{[^}]*border:\s*0;[^}]*box-shadow:\s*none;/,
    );
    expect(styles).toMatch(
      /\.portal-app \.portal-filter-form \.portal-filter-search > \.relative > \.field[\s\S]*?border-width:\s*1px/,
    );
    expect(explorerStyles).toContain(".portal-table-explorer-toolbar");
  });

  it("preserves a single outlined dataset search control around the icon", () => {
    const datasetPage = read("src/app/portal/(workspace)/dataset/page.jsx");
    expect(datasetPage).toMatch(
      /<div className="relative">[\s\S]*?<Search[\s\S]*?<input[\s\S]*?className="field pl-9"/,
    );
    expect(styles).toMatch(
      /\.portal-filter-search > \.relative\s*\{[^}]*border:\s*0;[^}]*box-shadow:\s*none;/,
    );
  });

  it("keeps page guidance actionable and avoids mixed English for basic actions", () => {
    const datasetPage = read("src/app/portal/(workspace)/dataset/page.jsx");
    const editDataset = read(
      "src/app/portal/(workspace)/dataset/[id]/edit/page.jsx",
    );
    const auditPage = read("src/app/portal/(workspace)/riwayat/page.jsx");
    expect(datasetPage).toContain(
      "Temukan dataset dengan pencarian dan filter",
    );
    expect(editDataset).toContain(
      "Simpan informasi sedikit demi sedikit selama dataset masih berstatus Draf.",
    );
    expect(editDataset).toContain("wajib untuk pemeriksaan ditandai");
    expect(auditPage).toContain("Riwayat aktivitas");
    expect(editDataset).not.toContain('title="Edit dataset"');
  });
});
