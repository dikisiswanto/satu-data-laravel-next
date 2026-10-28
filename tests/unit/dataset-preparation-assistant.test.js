import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DATASET_BLUEPRINTS,
  OPERATOR_START_STEPS,
  DATA_THEME_SUGGESTIONS,
} from "../../src/lib/data/dataset-blueprints.js";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("operator-focused dataset preparation", () => {
  it("provides practical file profiles and keeps advice separate from official standards", () => {
    expect(DATASET_BLUEPRINTS).toHaveLength(4);
    expect(DATASET_BLUEPRINTS.map((item) => item.id)).toEqual([
      "statistik-wilayah",
      "deret-indikator",
      "register-fasilitas",
      "geospasial",
    ]);
    for (const profile of DATASET_BLUEPRINTS) {
      expect(profile.title.length).toBeGreaterThan(5);
      expect(profile.description.length).toBeGreaterThan(20);
      expect(profile.files.length).toBeGreaterThan(0);
      for (const file of profile.files) {
        expect(file.href.startsWith("/templates/")).toBe(true);
        expect(existsSync(resolve(process.cwd(), `public${file.href}`))).toBe(
          true,
        );
      }
    }
  });

  it("documents regional data themes as recommendations, not approved official priorities", () => {
    expect(DATA_THEME_SUGGESTIONS.length).toBeGreaterThanOrEqual(6);
    expect(DATA_THEME_SUGGESTIONS.map((theme) => theme.id)).toContain(
      "pangan-perikanan-ekonomi",
    );
    expect(DATA_THEME_SUGGESTIONS.map((theme) => theme.id)).toContain(
      "infrastruktur-lingkungan",
    );
    expect(
      DATA_THEME_SUGGESTIONS.every((theme) => theme.purpose && theme.examples),
    ).toBe(true);
    expect(OPERATOR_START_STEPS).toHaveLength(5);
  });

  it("keeps advanced national metadata available but collapses it for a clean new draft", () => {
    const fields = read("src/components/admin/sdi-metadata-fields.jsx").replace(
      /\s+/g,
      " ",
    );
    expect(fields).toContain('<details className="group rounded-2xl');
    expect(fields).not.toContain("<details open=");
    expect(fields).toContain("hasSavedMetadata");
    expect(fields).toContain("Bisa dilengkapi setelah draf");
    expect(fields).toContain(
      "Kode SDS, ID DDP, dan kode referensi tidak boleh dibuat sendiri.",
    );
    for (const key of [
      "ddp_id",
      "sds_code",
      "reference_code",
      "method_description",
    ]) {
      expect(fields).toContain(`key: "${key}"`);
    }
  });

  it("surfaces a guided template assistant and next-step cards without extra dashboard database calls", () => {
    const createPage = read("src/app/portal/(workspace)/dataset/new/page.jsx");
    const assistant = read(
      "src/components/admin/dataset-preparation-assistant.jsx",
    );
    const blueprints = read("src/lib/data/dataset-blueprints.js");
    const dashboard = read("src/app/portal/(workspace)/page.jsx");
    expect(createPage).toContain("<DatasetPreparationAssistant />");
    expect(assistant).toContain('id="panduan-dataset"');
    expect(assistant).toContain("data-kamus-kolom.csv");
    expect(blueprints).toContain(
      "GeoJSON menggunakan koordinat longitude, latitude dalam WGS 84",
    );
    expect(assistant.replace(/\s+/g, " ")).toContain(
      "Daftar ini adalah saran, bukan Daftar Data atau Data Prioritas yang sudah ditetapkan.",
    );
    expect(dashboard).toContain("Langkah berikutnya");
    expect(dashboard).toContain("/portal/integrasi");
    expect(dashboard).toContain("buildDashboardViewModel");
    const dashboardModel = read("src/lib/admin/dashboard-view-model.js");
    expect(dashboardModel).toContain("/portal/dataset?status=draft");
  });

  it("keeps template CSVs empty of fabricated observations and provides a column dictionary starter", () => {
    const files = [
      "data-statistik-wilayah.csv",
      "data-deret-indikator.csv",
      "data-register-fasilitas.csv",
      "data-kamus-kolom.csv",
    ];
    for (const filename of files) {
      const text = read(`public/templates/${filename}`)
        .replace(/^\uFEFF/, "")
        .trim();
      const lines = text.split(/\r?\n/);
      expect(lines).toHaveLength(1);
      expect(lines[0].split(",").length).toBeGreaterThanOrEqual(5);
    }
  });
});
