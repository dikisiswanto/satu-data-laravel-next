import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesDir = new URL("../../src/app/styles/", import.meta.url);
const css = readdirSync(stylesDir)
  .filter((name) => name.endsWith(".css"))
  .map((name) => readFileSync(new URL(name, stylesDir), "utf8"))
  .join("\n");

describe("CSS pruning guardrails", () => {
  it("does not reintroduce legacy selectors that have no current markup", () => {
    for (const selector of [
      ".home-title",
      ".home-stat-item",
      ".home-search-wrap",
      ".catalog-filter-panel",
      ".prose-copy",
      ".organization-directory-page .mb-9",
      ".organization-detail-band .mb-9",
    ]) {
      expect(css).not.toContain(`${selector} {`);
    }
  });

  it("keeps one-off public-page decoration in Tailwind utilities instead of custom CSS hooks", () => {
    const homePage = readFileSync(
      new URL("../../src/app/(public)/page.jsx", import.meta.url),
      "utf8",
    );
    const helpPage = readFileSync(
      new URL("../../src/app/(public)/bantuan/page.jsx", import.meta.url),
      "utf8",
    );
    for (const selector of [
      ".home-topic-label",
      ".help-request-card",
      ".help-contact-card",
      ".help-card-icon",
      ".help-contact-icon",
      ".catalog-empty",
      ".home-empty-datasets-actions",
      ".organization-back-link",
    ]) {
      expect(css).not.toContain(`${selector} {`);
    }
    expect(homePage).toContain(
      "text-xs font-bold leading-5 text-[#263f52] sm:text-sm",
    );
    expect(homePage).toContain(
      "inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1d5fa7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174f8b]",
    );
    expect(helpPage).toContain(
      "bg-[linear-gradient(145deg,_#f1f7ff_0%,_#ffffff_72%)]",
    );
    expect(helpPage).toContain(
      "grid size-12 place-items-center rounded-xl bg-[#e8f1ff] text-[#1d5fa7]",
    );
    const catalogPage = readFileSync(
      new URL("../../src/app/(public)/dataset/page.jsx", import.meta.url),
      "utf8",
    );
    const organizationPage = readFileSync(
      new URL(
        "../../src/app/(public)/organisasi/[slug]/page.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(catalogPage).toContain(
      "min-h-64 w-full max-w-none justify-center rounded-2xl border border-[#d7e2ea] bg-white",
    );
    expect(organizationPage).toContain(
      "mb-4 inline-flex items-center gap-[.4rem] text-[.8rem] font-[650] [color:var(--public-teal)]",
    );
    expect(organizationPage).toContain('className="mb-4 sm:mb-4"');
    const organizationListPage = readFileSync(
      new URL("../../src/app/(public)/organisasi/page.jsx", import.meta.url),
      "utf8",
    );
    expect(organizationListPage).toContain('className="mb-6 sm:mb-6"');
    const pageHeading = readFileSync(
      new URL("../../src/components/page-heading.jsx", import.meta.url),
      "utf8",
    );
    expect(pageHeading).toMatch(
      /cn\(\s*"public-page-heading mb-9 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between",\s*className,?\s*\)/,
    );
  });

  it("keeps public page content inside the mobile viewport", () => {
    const responsive = readFileSync(
      new URL("../../src/app/styles/public-responsive.css", import.meta.url),
      "utf8",
    );
    expect(responsive).toContain("overflow-x: clip");
    expect(responsive).toContain(".overflow-x-auto");
    expect(responsive).toContain("overscroll-behavior-x: contain");
    expect(responsive).toContain("@media (max-width: 639px)");
    expect(responsive).toContain("overflow-wrap: anywhere");
    expect(
      readFileSync(
        new URL("../../src/app/globals.css", import.meta.url),
        "utf8",
      ),
    ).toContain("./styles/public-responsive.css");
  });

  it("keeps the catalog filter popup wide enough and above later content", () => {
    const responsive = readFileSync(
      new URL("../../src/app/styles/public-responsive.css", import.meta.url),
      "utf8",
    );
    const overrides = readFileSync(
      new URL("../../src/app/styles/overrides.css", import.meta.url),
      "utf8",
    );
    expect(responsive).toContain("width: min(34rem, calc(100vw - 2rem))");
    expect(responsive).toContain("max-width: calc(100vw - 2rem)");
    expect(responsive).not.toMatch(
      /\.catalog-filter-popover,\s*\.catalog-filter-popover-panel\s*\{[^}]*max-width:\s*100%/s,
    );
    expect(overrides).toContain(
      ".catalog-intro:has(.catalog-filter-popover[open])",
    );
    expect(overrides).toContain(".catalog-filter-popover-panel {");
  });

  it("adds restrained motion to the homepage database illustration and respects reduced motion", () => {
    const motion = readFileSync(
      new URL("../../src/app/styles/public-pages-motion.css", import.meta.url),
      "utf8",
    );
    for (const animation of [
      "wajo-orbit-breathe",
      "wajo-orbit-rotate",
      "wajo-database-float",
      "wajo-chip-drift",
      "wajo-live-pulse",
    ]) {
      expect(motion).toContain(`@keyframes ${animation}`);
    }
    expect(motion).toContain("@media (prefers-reduced-motion: reduce)");
    expect(motion).toMatch(
      /\.home-visual-chip-top,[\s\S]*?animation:\s*none !important/s,
    );
  });

  it("preserves styles used by current markup and dynamic class variants", () => {
    for (const selector of [
      ".home-hero",
      ".home-topic-card",
      ".home-topic-icon",
      ".home-dataset-art-blue",
      ".statistics-card-tone-0",
      ".portal-main",
      ".field",
    ]) {
      expect(css).toContain(selector);
    }
    const componentStyles = readFileSync(
      new URL("../../src/app/styles/component-styles.css", import.meta.url),
      "utf8",
    );
    expect(
      (
        componentStyles.match(
          /\.home-topic-card:nth-child\(8n \+ \d\) \.home-topic-icon/g,
        ) || []
      ).length,
    ).toBe(8);
    expect(componentStyles).not.toMatch(
      /\.home-topic-card:nth-child\([^)]*\)\s*\{/,
    );
  });
});
