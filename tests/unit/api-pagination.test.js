import { describe, expect, it } from "vitest";
import {
  normalizePublicSearch,
  parseBoundedPositiveInteger,
} from "../../src/lib/api/pagination.js";

describe("parseBoundedPositiveInteger", () => {
  it("uses the fallback for missing, malformed, unsafe, or non-positive values", () => {
    for (const value of [
      null,
      "",
      "2pages",
      "0",
      "-4",
      "1.5",
      "9".repeat(40),
    ]) {
      expect(parseBoundedPositiveInteger(value, 1, 100)).toBe(1);
    }
  });

  it("clamps valid values to the supported maximum", () => {
    expect(parseBoundedPositiveInteger("25", 1, 100)).toBe(25);
    expect(parseBoundedPositiveInteger("1000000", 1, 100)).toBe(100);
  });
});

describe("normalizePublicSearch", () => {
  it("mempertahankan huruf Indonesia dan membuang karakter pencarian yang tidak didukung", () => {
    expect(normalizePublicSearch("Data OPD, tahun (2025)%")).toBe(
      "Data OPD tahun 2025",
    );
  });

  it("bounds length and whitespace", () => {
    expect(normalizePublicSearch("  data   terbuka  ")).toBe("data terbuka");
    expect(normalizePublicSearch("a".repeat(150), 20)).toHaveLength(20);
    expect(normalizePublicSearch(null)).toBe("");
  });
});
