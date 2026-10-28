import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const read = (file) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("consistent admin design system", () => {
  const shell = read("src/components/portal-shell.jsx");
  const nav = read("src/components/portal-navigation.jsx");
  const navigationLink = read("src/components/ui/navigation-link.jsx");
  const heading = read("src/components/portal-page-heading.jsx");
  const breadcrumbs = read("src/components/portal-breadcrumbs.jsx");
  const styles = read("src/app/styles/admin-design-system.css");
  const globals = read("src/app/globals.css");
  const normalizedStyles = styles.replace(/\s+/g, " ");

  it("uses a dedicated page-heading component on authenticated pages", () => {
    expect(heading).toContain("portal-page-heading");
    expect(heading).toContain("portal-page-title");
    expect(heading).toContain("portal-page-description");
    expect(heading).toContain("portal-page-actions");
    expect(heading).toContain("PortalBreadcrumbs");
    expect(breadcrumbs).toContain('aria-label="Jejak navigasi"');
    expect(globals).toContain("./styles/admin-design-system.css");
  });

  it("keeps one responsive shell with accessible primary navigation and focusable main content", () => {
    expect(shell).toContain("<PortalNavigation roles={roles} />");
    expect(shell).toContain('id="konten-utama"');
    expect(shell).toContain("tabIndex={-1}");
    expect(nav).toContain('aria-label="Navigasi pengelola"');
    expect(navigationLink).toContain("aria-current");
    expect(nav).toContain("portal-mobile-navigation");
    expect(nav).toContain("portal-nav-desktop");
    expect(nav).toContain("item.roles.some");
  });

  it("keeps the admin chrome in a persistent workspace layout", () => {
    const workspaceLayout = read("src/app/portal/(workspace)/layout.jsx");
    const routeLayout = read("src/app/portal/layout.jsx");
    const loadingFrame = read("src/components/admin/portal-loading-frame.jsx");
    const dashboard = read("src/app/portal/(workspace)/page.jsx");

    expect(workspaceLayout).toContain(
      "<PortalShell email={user.email} shellContext={shellContext}>",
    );
    expect(routeLayout).not.toContain("PortalShell");
    expect(loadingFrame).toContain("{children}");
    expect(loadingFrame).not.toContain("<PortalNavigation");
    expect(dashboard).not.toContain("<PortalShell");
  });

  it("standardizes list panels, forms, tables, and responsive mobile navigation", () => {
    for (const selector of [
      ".portal-workspace-panel",
      ".portal-panel-heading",
      ".portal-form-card",
      ".portal-data-table",
      "table:not(.portal-data-table) th",
      "table:not(.portal-data-table) td",
    ])
      expect(normalizedStyles).toContain(selector);
    expect(nav).toContain("portal-mobile-navigation-panel grid gap-3 border-t");
    expect(styles).toContain("@media (max-width: 639px)");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });

  it("keeps all portal loading and content page headings on the same component", () => {
    const root = resolve(process.cwd(), "src/app/portal");
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".jsx")) files.push(path);
      }
    };
    walk(root);
    const pages = files.filter((path) => {
      const source = readFileSync(path, "utf8");
      return (
        source.includes("<PageHeading") || source.includes("</PageHeading>")
      );
    });
    for (const path of pages) {
      const source = readFileSync(path, "utf8");
      expect(source, path).toContain("portal-page-heading");
    }
  });

  it("keeps portal form and information cards full width and rotates only disclosure arrows", () => {
    expect(normalizedStyles).toContain(
      ".portal-form-card, .portal-form-section",
    );
    expect(normalizedStyles).toContain("max-width: none !important");
    expect(normalizedStyles).toContain("svg.portal-disclosure-arrow");
    expect(normalizedStyles).not.toContain("svg:last-child {");
    expect(read("src/components/portal-context-guide.jsx")).toContain(
      "portal-disclosure-arrow",
    );
    expect(
      read("src/components/admin/dataset-preparation-assistant.jsx"),
    ).toContain("portal-disclosure-arrow");
    expect(read("src/components/admin/organization-form.jsx")).toContain(
      "w-full max-w-none",
    );
  });

  it("keeps submit and pending action buttons dimension-stable when state changes", () => {
    const formButton = read("src/components/ui/form-submit-button.jsx");
    const pendingButton = read("src/components/ui/pending-action-button.jsx");
    const buttonStyles = read("src/app/styles/form-text-safety.css");
    const compactShell = read("src/components/portal-shell.jsx");

    expect(formButton).toContain('data-stateful-button="true"');
    expect(pendingButton).toContain('data-stateful-button="true"');
    for (const source of [formButton, pendingButton]) {
      expect(source).toContain("button-state-stack");
      expect(source).toContain("button-state-normal");
      expect(source).toContain("button-state-pending");
      expect(source).toContain('data-pending={pending ? "true" : "false"}');
    }
    const normalizedButtonStyles = buttonStyles.replace(/\s+/g, " ");
    expect(normalizedButtonStyles).toContain(
      'button[data-stateful-button="true"]',
    );
    expect(normalizedButtonStyles).toContain("padding-block: 0.625rem");
    expect(normalizedButtonStyles).toContain(
      "transition-property: background-color, border-color, color, box-shadow, opacity",
    );
    expect(compactShell).toContain("w-12 shrink-0 items-center justify-center");
    expect(compactShell).toMatch(
      /className="sr-only sm:hidden"\s*>\s*Sedang keluar\s*<\/span>/,
    );
  });
});
