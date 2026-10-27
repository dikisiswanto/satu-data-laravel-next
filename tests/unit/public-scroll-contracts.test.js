import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const layout = read("src/components/public-layout.jsx");
const manager = read("src/components/public-scroll-manager.jsx");
const scrollHelper = read("src/lib/public-scroll.js");
const catalog = read("src/app/(public)/dataset/page.jsx");
const statistics = read("src/app/(public)/statistik/page.jsx");
const organizationDirectory = read("src/components/organization-directory.jsx");
const resourcePreview = read("src/components/dataset-resource-preview.jsx");

describe("public route scroll behavior", () => {
  it("mounts route scroll behavior safely inside Suspense", () => {
    expect(layout).toContain("<Suspense fallback={null}>");
    expect(layout).toContain("<PublicScrollManager />");
    expect(manager).toContain('from "next/navigation"');
  });

  it("returns to the top on public route changes without overriding explicit anchors", () => {
    expect(manager).toContain("previous.pathname !== pathname");
    expect(manager).toContain(
      "if (!window.location.hash) scrollPublicPageToTop()",
    );
    expect(scrollHelper).toContain(
      'window.scrollTo({ top: 0, left: 0, behavior: "auto" })',
    );
  });

  it("scrolls URL-based catalog and indicator pagination to their list containers", () => {
    expect(manager).toContain('"/dataset": "dataset-list"');
    expect(manager).toContain('"/statistik": "statistics-list"');
    expect(manager).toContain("previous.page !== page");
    expect(catalog).toContain('id="dataset-list"');
    expect(statistics).toContain('id="statistics-list"');
    expect(catalog).toContain("scroll={false}");
    expect(statistics).toContain("scroll={false}");
    expect(catalog).toContain("scroll-mt-24");
    expect(statistics).toContain("scroll-mt-24");
  });

  it("scrolls local organization and preview pagination to their list parents", () => {
    expect(organizationDirectory).toContain(
      "scrollToPublicList(organizationListRef.current)",
    );
    expect(organizationDirectory).toContain('id="organization-list"');
    expect(resourcePreview).toContain(
      "scrollToPublicList(previewSectionRef.current)",
    );
    expect(resourcePreview).toContain("ref={previewSectionRef}");
    expect(resourcePreview).toContain("scroll-mt-24");
  });
});
