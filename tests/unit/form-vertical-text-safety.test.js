import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("form vertical text safety across public and admin pages", () => {
  const safety = read("src/app/styles/form-text-safety.css");
  const normalizedSafety = safety.replace(/\s+/g, " ");
  const globals = read("src/app/globals.css");

  it("loads form text safety after all page and responsive styles", () => {
    const designSystemImport = globals.indexOf(
      '@import "./styles/admin-design-system.css";',
    );
    const textSafetyImport = globals.indexOf(
      '@import "./styles/form-text-safety.css";',
    );
    expect(designSystemImport).toBeGreaterThanOrEqual(0);
    expect(textSafetyImport).toBeGreaterThan(designSystemImport);
    expect(globals).toContain('@plugin "@tailwindcss/forms";');
  });

  it("pairs fixed-height single-line controls with zero vertical padding and a safe line-height", () => {
    expect(safety).toMatch(/height:\s*44px/);
    expect(safety).toMatch(
      /padding-top:\s*0;[\s\S]*?padding-bottom:\s*0;[\s\S]*?line-height:\s*1\.4;/,
    );
    expect(safety).toContain(".portal-app .portal-table-search input");
    expect(safety).toContain(".catalog-filter-popover-panel");
    expect(normalizedSafety).toContain(".login-form .field");
    expect(normalizedSafety).toContain(".portal-app form :is(");
  });

  it("also normalizes input-based submit controls and file picker controls", () => {
    expect(safety).toContain('input[type="submit"]');
    expect(safety).toMatch(
      /input\[type="file"\][\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*44px;[\s\S]*?line-height:\s*1\.4/,
    );
  });

  it("keeps textarea height content-friendly rather than locking a short fixed height", () => {
    expect(safety).toMatch(/form textarea[\s\S]*?height:\s*auto;/);
    expect(safety).toMatch(/min-height:\s*6rem/);
    expect(safety).toMatch(/line-height:\s*1\.5/);
    expect(safety).toContain("overflow-y: auto");
  });

  it("allows form buttons to grow when their labels wrap instead of clipping text", () => {
    expect(safety).toMatch(
      /form button[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*44px;[\s\S]*?line-height:\s*1\.4;[\s\S]*?white-space:\s*normal;/,
    );
    expect(safety).toContain("overflow-wrap: anywhere");
  });

  it("protects helper and validation copy while preserving screen-reader-only labels", () => {
    expect(safety).toContain("label:not(.sr-only)");
    expect(safety).toMatch(/\[id\$="-help"\]/);
    expect(safety).toMatch(/\[id\$="-error"\]/);
    expect(safety).toContain("max-height: none");
    expect(safety).not.toMatch(
      /label:not\(\.sr-only\)[\s\S]{0,180}overflow:\s*hidden/,
    );
  });
});
