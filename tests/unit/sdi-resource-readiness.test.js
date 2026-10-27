import { describe, expect, it } from "vitest";
import { getSdiExportResources } from "../../src/lib/sdi/metadata.js";

describe("SDI export resource eligibility", () => {
  const resource = (overrides = {}) => ({
    id: "resource-1",
    dataset_version: 3,
    is_source: false,
    is_public: true,
    conversion_status: "succeeded",
    ...overrides,
  });

  it("accepts only public processed distributions from the active version", () => {
    expect(getSdiExportResources([
      resource(),
      resource({ id: "old-version", dataset_version: 2 }),
      resource({ id: "private", is_public: false }),
      resource({ id: "pending", conversion_status: "queued" }),
      resource({ id: "source", is_source: true }),
      resource({ id: "db-source-flag", is_source: 1 }),
    ], 3).map((item) => item.id)).toEqual(["resource-1"]);
  });

  it("fails closed for missing or malformed resource lists", () => {
    expect(getSdiExportResources(null, 3)).toEqual([]);
    expect(getSdiExportResources([null, resource({ is_source: true })], 3)).toEqual([]);
  });
});
