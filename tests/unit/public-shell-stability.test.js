import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const header = read("src/components/site-header.jsx");
const login = read("src/app/portal/(auth)/login/page.jsx");
const template = read("src/app/(public)/template.jsx");
const sectionReveal = read("src/components/section-reveal.jsx");
const publicResponsive = read("src/app/styles/public-responsive.css");
const publicHomeStyles = read("src/app/styles/public-home-catalog.css");
const searchForm = read("src/components/search-form.jsx");
const catalogPage = read("src/app/(public)/dataset/page.jsx");
const preview = read("src/components/dataset-resource-preview.jsx");
const home = read("src/app/(public)/page.jsx");

const loaderPaths = [
  "src/app/(public)/dataset/loading.jsx",
  "src/app/(public)/statistik/loading.jsx",
  "src/app/(public)/statistik/[slug]/loading.jsx",
  "src/app/(public)/organisasi/loading.jsx",
  "src/app/(public)/dataset/[slug]/loading.jsx",
  "src/app/(public)/organisasi/[slug]/loading.jsx",
];

describe("public mobile layout, stable shell and portal login entry", () => {
  it("always sends the public header entry to login and redirects only verified sessions to the dashboard", () => {
    expect(
      header.match(/href="\/portal\/login"/g)?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(header).not.toMatch(/href=\{[^}]*user[^}]*\/portal/);
    expect(login).toContain(
      'if (user && !sessionCheckError && !authUnavailable) redirect("/portal");',
    );
    expect(login).not.toContain("requestedAuthStatus");
  });

  it("keeps route transitions stable and limits entry motion to the homepage hero", () => {
    expect(template).toContain("return children;");
    expect(template).not.toContain("public-route-transition");
    expect(sectionReveal).not.toContain("IntersectionObserver");
    expect(sectionReveal).not.toContain("is-pending");
    expect(read("src/app/globals.css")).toContain(
      "./styles/public-responsive.css",
    );
    const publicMotion = read("src/app/styles/public-pages-motion.css");
    expect(publicMotion).not.toContain("@keyframes public-route-enter");
    expect(publicMotion).toContain("@keyframes home-hero-element-enter");
    expect(publicMotion).not.toContain("@keyframes home-hero-title-enter");
    expect(publicMotion).toContain("@keyframes home-hero-visual-enter");
    expect(publicMotion).not.toContain("@keyframes home-hero-stat-enter");
    expect(publicMotion).toContain("@media (prefers-reduced-motion: reduce)");
    expect(publicMotion).toMatch(
      /\.home-hero-copy,[\s\S]*?animation: none !important;[\s\S]*?transition: none !important;/,
    );
    expect(publicMotion).toContain(
      ".home-visual-caption {\n  animation: home-hero-element-enter",
    );
    expect(publicMotion).not.toMatch(/\.home-hero-copy > [^{]+\{\s*animation:/);
    expect(publicMotion).not.toMatch(
      /\.home-stats(?: > \.home-stat|\.home-stats-note)[^{]*\{\s*animation:/,
    );
    expect(publicMotion).toMatch(
      /\.home-stats,[\s\S]*?animation: none !important;[\s\S]*?transition: none !important;/,
    );
    expect(publicHomeStyles).not.toContain("@keyframes public-route-enter");
    expect(publicHomeStyles).not.toContain(".public-section-reveal.is-pending");
  });

  it("provides responsive mobile search controls and keeps wide public tables inside their own scroll region", () => {
    expect(searchForm).toContain("flex-col gap-2 sm:flex-row");
    expect(searchForm).toContain("w-full shrink-0 sm:w-auto");
    expect(catalogPage).toContain("catalog-search-panel");
    expect(catalogPage).toContain("catalog-filter-popover-panel");
    expect(publicResponsive).toContain(".public-table-scroll-region table");
    expect(publicResponsive).toContain("max-width: calc(100vw - 2rem)");
    expect(preview).toContain("public-table-scroll-hint");
    expect(preview).toContain("public-table-scroll-region");
  });

  it("keeps home headings static while reserving dynamic hero and dataset content", () => {
    const compactHome = home.replace(/\s+/g, " ");
    expect(compactHome).toMatch(
      /<Suspense\b[^>]*fallback=\{<HomeHeroContent\s+loading(?:=\{true\})?\s*\/>\}>/,
    );
    expect(compactHome).toMatch(
      /<Suspense\b[^>]*fallback=\{<HomeLatestDatasetsSkeleton\s*\/>\}>/,
    );
    expect(home).toContain("home-metric-skeleton");
    expect(home).toContain("Temukan Data,");
    expect(home).toContain("Pahami {siteConfig.regionShortName}.");
  });

  it("provides accessible shimmer fallbacks on public routes with dynamic content", () => {
    for (const path of loaderPaths) {
      const loaderPath = new URL(`../../${path}`, import.meta.url);
      expect(
        existsSync(loaderPath),
        `missing route-specific loader: ${path}`,
      ).toBe(true);
      const loader = read(path);
      const compactLoader = loader.replace(/\s+/g, " ");
      expect(compactLoader, `loader has no shimmer markup: ${path}`).toMatch(
        /loading-skeleton|Skeleton/,
      );
      expect(compactLoader, `loader is missing aria-busy: ${path}`).toMatch(
        /aria-busy\s*=\s*(?:"true"|'true'|\{true\})/,
      );
    }
  });

  it("does not use catch-all loading fallbacks that replace static public shells", () => {
    for (const path of [
      "src/app/loading.jsx",
      "src/app/(public)/loading.jsx",
    ]) {
      const fullPath = new URL(`../../${path}`, import.meta.url);
      expect(
        existsSync(fullPath),
        `obsolete generic fallback still exists at ${path}; run npm run fix:public-shell-loading and commit the deletion`,
      ).toBe(false);
    }
  });
});
