import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const searchService = read("backend/app/Services/PublicDatasetSearch.php");
const publicController = read(
  "backend/app/Http/Controllers/Api/PublicDataController.php",
);
const catalogPage = read("src/app/(public)/dataset/page.jsx");
const homePage = read("src/app/(public)/page.jsx");

describe("public dataset intent-oriented search", () => {
  it("expands subject intent into Indonesian topic synonyms", () => {
    expect(searchService).toContain("'pendidikan' => ['sekolah'");
    expect(searchService).toContain("'sekolah' => ['pendidikan'");
    expect(searchService).toContain("'kesehatan' => ['rumah sakit'");
    expect(searchService).toContain("'jumlah' => ['total'");
  });

  it("searches descriptive metadata, keywords, SDI metadata, and organizations", () => {
    for (const field of [
      "datasets.title",
      "datasets.description",
      "datasets.category",
      "datasets.keywords",
      "datasets.source_name",
      "datasets.geographic_scope",
      "datasets.methodology",
      "short_name",
      "standard_concept",
      "standard_definition",
      "method_description",
    ]) {
      expect(searchService).toContain(field);
    }
    expect(searchService).toContain("orderByRelevance");
    expect(publicController).toContain("$datasetSearch->apply(");
  });

  it("keeps natural-language examples visible on the public search UI", () => {
    expect(catalogPage).toContain("pendidikan dan sekolah");
    expect(catalogPage).toContain("jumlah sekolah menurut kecamatan");
    expect(homePage).toContain("pendidikan atau sekolah");
  });
});
