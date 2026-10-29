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
    expect(searchService).toContain("'pemerintahan' => ['opd'");
    expect(searchService).toContain("'keuangan' => ['anggaran'");
    expect(searchService).toContain("'perdagangan' => ['pasar'");
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

  it("preserves original multiword tokens before synonym expansion and supports bounded typo tolerance", () => {
    expect(searchService).toContain(
      "Round-robin expansion lets multiple topics contribute aliases",
    );
    expect(searchService).toContain("$seen = array_fill_keys($terms, true);");
    expect(searchService).toContain("count($terms) < $termBudget");
    expect(searchService).toContain("$termBudget = max(24, count($tokens));");
    expect(searchService).toContain("array_slice($terms, 0, 20)");
    expect(searchService).toContain(
      "$multiplier = in_array($term, $originalTerms, true) ? 3 : 1;",
    );
    expect(searchService).toContain(
      "private function typoPatterns(string $token): array",
    );
    expect(searchService).toContain(
      "array_slice($this->tokenize($query), 0, 3)",
    );
  });

  it("keeps natural-language examples visible on the public search UI", () => {
    expect(catalogPage).toContain("sekolah atau puskesmas");
    expect(catalogPage).toContain("realisasi anggaran kecamatan");
    expect(homePage).toContain("sekolah, kesehatan, anggaran");
  });
});
