import { describe, expect, it } from "vitest";
import {
  MAX_PREVIEW_BATCH_ROWS,
  MAX_PREVIEW_PROJECTION_BYTES,
  MAX_PREVIEW_REQUEST_BYTES,
  inspectPreviewProjection,
} from "../../src/lib/conversion/preview-projection.js";

describe("bounded dataset preview projection", () => {
  it("accepts normal rows and returns stable byte estimates", () => {
    const result = inspectPreviewProjection([
      { id: 1, name: "Wajo" },
      { id: 2, name: "Sengkang" },
    ]);
    expect(result.available).toBe(true);
    expect(result.rowBytes).toHaveLength(2);
    expect(result.totalBytes).toBeGreaterThan(2);
    expect(result.totalBytes).toBeLessThan(MAX_PREVIEW_PROJECTION_BYTES);
  });

  it("skips a projection whose aggregate JSONB estimate exceeds the storage budget", () => {
    const result = inspectPreviewProjection(
      Array.from({ length: 7_000 }, (_, index) => ({
        index,
        value: "x".repeat(5_000),
      })),
    );
    expect(result.available).toBe(false);
    expect(result.reason).toBe("projection_too_large");
    expect(result.rowBytes).toHaveLength(0);
  });

  it("skips a row that cannot fit safely in one PostgREST insert request", () => {
    const result = inspectPreviewProjection([
      { value: "x".repeat(MAX_PREVIEW_REQUEST_BYTES) },
    ]);
    expect(result.available).toBe(false);
    expect(result.reason).toBe("row_too_large");
  });

  it("keeps request batch caps aligned with the worker contract", () => {
    expect(MAX_PREVIEW_BATCH_ROWS).toBe(1_000);
    expect(MAX_PREVIEW_REQUEST_BYTES).toBe(768 * 1024);
  });
});
