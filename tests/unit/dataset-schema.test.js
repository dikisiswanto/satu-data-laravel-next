import { describe, expect, it } from "vitest";
import {
  datasetMetadataSchema,
  detectInputFormat,
} from "../../src/lib/validation/dataset.js";
const valid = {
  title: "Data produksi pertanian",
  description:
    "Dataset contoh pengujian yang menjelaskan data produksi pertanian.",
  organization_id: "11111111-1111-4111-8111-111111111111",
  geographic_scope: "Kabupaten Wajo",
  update_frequency: "yearly",
  source_name: "Unit sumber data",
  license_text: "Sesuai ketentuan sumber",
};
describe("datasetMetadataSchema", () => {
  it("accepts complete valid metadata", () =>
    expect(datasetMetadataSchema.safeParse(valid).success).toBe(true));
  it("rejects invalid date period order", () =>
    expect(
      datasetMetadataSchema.safeParse({
        ...valid,
        reference_period_start: "2025-12-01",
        reference_period_end: "2025-01-01",
      }).success,
    ).toBe(false));
  it("rejects short descriptions", () =>
    expect(
      datasetMetadataSchema.safeParse({ ...valid, description: "pendek" })
        .success,
    ).toBe(false));
});
describe("detectInputFormat", () => {
  it("accepts CSV with matching extension and mime type", () =>
    expect(detectInputFormat("data.csv", "text/csv")).toBe("csv"));
  it("rejects executable masquerading as CSV", () =>
    expect(detectInputFormat("malware.exe", "text/csv")).toBe(null));
  it("rejects mismatched spreadsheet mime", () =>
    expect(detectInputFormat("data.xlsx", "image/png")).toBe(null));
});
