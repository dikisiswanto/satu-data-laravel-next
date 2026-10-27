import { describe, expect, it } from "vitest";
import { isHttpUrl, safeHttpUrl } from "../../src/lib/validation/url.js";

describe("external URL safety", () => {
  it("allows HTTP and HTTPS URLs", () => {
    expect(isHttpUrl("https://data.wajo.go.id/source")).toBe(true);
    expect(isHttpUrl("http://localhost:3000")).toBe(true);
  });

  it("rejects executable and non-web protocols", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "mailto:a@example.com",
      "//evil.example",
      "https://user:password@example.com",
      "not a url",
    ]) {
      expect(isHttpUrl(value)).toBe(false);
      expect(safeHttpUrl(value)).toBe(null);
    }
  });
});
