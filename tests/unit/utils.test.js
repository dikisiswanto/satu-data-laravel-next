import { describe, expect, it } from "vitest";
import { safeReturnPath, formatBytes } from "../../src/lib/utils.js";
describe("safeReturnPath", () => {
  it("allows an internal path", () =>
    expect(safeReturnPath("/portal/dataset")).toBe("/portal/dataset"));
  it("blocks absolute and protocol-relative URLs", () => {
    expect(safeReturnPath("https://example.com")).toBe("/portal");
    expect(safeReturnPath("//example.com")).toBe("/portal");
  });
});
describe("formatBytes", () => {
  it("formats MB values", () => expect(formatBytes(1048576)).toBe("1.0 MB"));
  it("handles invalid values", () =>
    expect(formatBytes(-1)).toBe("Ukuran tidak diketahui"));
});
