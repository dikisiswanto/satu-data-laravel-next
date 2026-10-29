import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file) => readFileSync(resolve(process.cwd(), file), "utf8");

const observationPage = read(
  "src/app/portal/(workspace)/statistik/[id]/observasi/page.jsx",
);
const observationManager = read(
  "src/components/admin/indicator-observation-manager.jsx",
);
const indicatorActions = read("src/components/admin/indicator-actions.jsx");
const indicatorListPage = read("src/app/portal/(workspace)/statistik/page.jsx");
const routes = read("backend/routes/api.php");
const controller = read(
  "backend/app/Http/Controllers/Api/PortalIndicatorController.php",
);
const permissions = read(
  "backend/database/migrations/2026_10_26_000003_expand_authorization_and_integrity_constraints.php",
);

describe("indicator observation page and API contracts", () => {
  it("imports tenant configuration used by the editable observation form", () => {
    expect(observationManager).toContain(
      'import { siteConfig } from "@/lib/site-config";',
    );
    expect(observationManager).toContain(
      "${siteConfig.regionName} atau kecamatan terkait",
    );
  });

  it("uses routes and response envelopes that are implemented by the Laravel portal API", () => {
    expect(observationPage).toContain(
      "portalData(`indicators/${encodeURIComponent(id)}`)",
    );
    expect(observationPage).toContain(
      "portalData(`indicators/${encodeURIComponent(id)}/observations`)",
    );
    expect(observationPage).toContain(
      "if ([403, 404].includes(Number(error?.status))) notFound();",
    );
    expect(indicatorListPage).toContain(
      "href={`/portal/statistik/${item.id}/observasi`}",
    );
    expect(routes).toContain(
      "Route::get('/indicators/{id}', [PortalIndicatorController::class, 'show'])",
    );
    expect(routes).toContain(
      "Route::get('/indicators/{id}/observations', [PortalIndicatorController::class, 'observations'])",
    );
    expect(routes).toContain(
      "Route::post('/indicators/{id}/observations', [PortalIndicatorController::class, 'saveObservation'])",
    );
    expect(routes).toContain(
      "Route::patch('/indicators/{id}/observations/{observationId}', [PortalIndicatorController::class, 'publishObservation'])",
    );
    expect(controller).toContain("return response()->json(['data' => $rows]");
    expect(observationManager).toContain(
      "/api/v1/portal/indicators/${encodeURIComponent(indicator.id)}/observations",
    );
    expect(observationManager).toContain(
      "/api/v1/portal/indicators/${encodeURIComponent(indicator.id)}/observations/${encodeURIComponent(id)}",
    );
  });

  it("keeps reviewer access separate from publication access", () => {
    expect(indicatorActions).toContain("canReview = false");
    expect(indicatorActions).toContain("canPublish = false");
    expect(indicatorActions).toContain("{canPublish ? (");
    expect(indicatorActions).toContain("{canReview ? (");
    expect(indicatorListPage).toContain("canPublish={");
    expect(indicatorListPage).toContain('m.role === "admin_opd"');
    expect(observationPage).toContain(
      'item.organization_id === indicator.organization_id && item.role === "admin_opd"',
    );
    expect(permissions).toContain(
      "'indicators.publish' => ['super_admin', 'data_admin', 'admin_opd']",
    );
  });

  it("normalizes dataset action button sizing and destructive-action emphasis", () => {
    const formButton = read("src/components/ui/form-submit-button.jsx");
    const pendingButton = read("src/components/ui/pending-action-button.jsx");
    const buttonStyles = read("src/app/styles/form-text-safety.css");
    const archive = read("src/components/admin/dataset-archive-action.jsx");
    const abandonVersion = read(
      "src/components/admin/dataset-version-abandon-action.jsx",
    );
    const datasetPage = read(
      "src/app/portal/(workspace)/dataset/[id]/page.jsx",
    );

    for (const source of [formButton, pendingButton]) {
      expect(source).toContain("min-h-11");
      expect(source).toContain("grid-cols-[minmax(0,1fr)]");
    }
    expect(buttonStyles).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(buttonStyles).toContain("overflow-wrap: anywhere");
    expect(buttonStyles).toContain("white-space: normal");
    expect(indicatorActions).toContain(
      "focus-visible:ring-2 focus-visible:ring-focus",
    );
    expect(indicatorListPage).toContain(
      "min-h-10 max-w-full items-center justify-center",
    );
    expect(archive).toContain("border-red-200 bg-white");
    expect(archive).toContain("Arsipkan dataset");
    expect(abandonVersion).toContain("border-red-200 bg-white");
    expect(datasetPage).toContain("Ajukan pemeriksaan");
    expect(datasetPage).toContain("Buat versi baru");
    expect(datasetPage).toContain("focus-visible:ring-2");
  });
});
