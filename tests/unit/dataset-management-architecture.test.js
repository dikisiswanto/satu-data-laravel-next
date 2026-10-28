import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file) => readFileSync(resolve(process.cwd(), file), "utf8");

const datasetDetail = read("src/app/portal/(workspace)/dataset/[id]/page.jsx");
const datasetLoading = read(
  "src/app/portal/(workspace)/dataset/[id]/loading.jsx",
);
const metadataForm = read("src/components/admin/dataset-metadata-form.jsx");
const indicatorList = read("src/app/portal/(workspace)/statistik/page.jsx");
const indicatorObservations = read(
  "src/app/portal/(workspace)/statistik/[id]/observasi/page.jsx",
);

describe("dataset management follows a dataset-resource workflow", () => {
  it("orders dataset metadata before resources, distributions and version history", () => {
    const metadataIndex = datasetDetail.indexOf('id="dataset-metadata"');
    const sourceIndex = datasetDetail.indexOf('id="dataset-source-workspace"');
    const distributionsIndex = datasetDetail.indexOf(
      'id="dataset-distributions"',
    );
    const versionsIndex = datasetDetail.indexOf('id="dataset-versions"');
    const reviewIndex = datasetDetail.indexOf('id="dataset-review"');

    expect(metadataIndex).toBeGreaterThan(-1);
    expect(metadataIndex).toBeLessThan(sourceIndex);
    expect(sourceIndex).toBeLessThan(distributionsIndex);
    expect(distributionsIndex).toBeLessThan(versionsIndex);
    expect(versionsIndex).toBeLessThan(reviewIndex);
    expect(datasetDetail).toContain('aria-label="Bagian pengelolaan dataset"');
    expect(datasetDetail).toContain('aria-label="Tindakan utama dataset"');
    expect(datasetDetail).toContain("Edit metadata");
    expect(datasetDetail).toContain("Unggah berkas sumber");
    expect(datasetDetail).toContain("Distribusi unduhan");
    expect(datasetDetail).toContain('["#dataset-metadata", "Metadata"]');
    expect(datasetDetail).toContain(
      '["#dataset-source-workspace", "Data & berkas"]',
    );
    expect(datasetDetail).toContain('["#dataset-distributions", "Distribusi"]');
  });

  it("makes the upload action prominent and keeps derived distributions separate", () => {
    const sourceSectionStart = datasetDetail.indexOf(
      'id="dataset-source-workspace"',
    );
    const sourceSectionEnd = datasetDetail.indexOf(
      'id="dataset-distributions"',
    );
    const sourceSection = datasetDetail.slice(
      sourceSectionStart,
      sourceSectionEnd,
    );
    expect(sourceSection.indexOf("<SourceUploadForm")).toBeGreaterThan(-1);
    expect(sourceSection.indexOf("<SourceUploadForm")).toBeLessThan(
      sourceSection.indexOf('caption="Berkas sumber dataset"'),
    );
    expect(sourceSection).toContain("isNewVersion={isNewVersionInProgress}");
    expect(datasetDetail).toContain(
      'caption="Distribusi hasil pengolahan dataset"',
    );
    expect(datasetDetail).toContain(
      "const sourceResources = resources.filter((resource) => Boolean(resource.is_source))",
    );
    expect(datasetDetail).toContain(
      "const distributionResources = resources.filter((resource) => !resource.is_source)",
    );
  });

  it("distinguishes dataset provenance metadata from the uploaded file", () => {
    expect(metadataForm).toContain(
      "Sumber / penerbit data (wajib sebelum pemeriksaan)",
    );
    expect(metadataForm).toContain("URL rujukan sumber");
    expect(metadataForm).toContain(
      "Berkas yang diunggah dikelola terpisah pada halaman detail dataset.",
    );
    expect(metadataForm).toContain("DatasetCategoryField");
    expect(metadataForm).toContain("2. Kategori dan kata kunci");
    expect(metadataForm).toContain("4. Definisi, metode, dan standar SDI");
  });

  it("keeps the loading shell in the same major section order as the resolved page", () => {
    const shellMetadata = datasetLoading.indexOf('id="dataset-metadata"');
    const shellSource = datasetLoading.indexOf('id="dataset-source-workspace"');
    const shellDistributions = datasetLoading.indexOf(
      'id="dataset-distributions"',
    );
    const shellVersions = datasetLoading.indexOf('id="dataset-versions"');
    const shellReview = datasetLoading.indexOf('id="dataset-review"');
    expect(shellMetadata).toBeGreaterThan(-1);
    expect(shellMetadata).toBeLessThan(shellSource);
    expect(shellSource).toBeLessThan(shellDistributions);
    expect(shellDistributions).toBeLessThan(shellVersions);
    expect(shellVersions).toBeLessThan(shellReview);
    expect(datasetLoading).toContain("Unggah berkas sumber");
    expect(datasetLoading).toContain('aria-label="Tindakan utama dataset"');
    expect(datasetLoading).toContain("Kelengkapan sebelum pemeriksaan");
  });
});

describe("indicator workbench keeps definitions and observations distinct", () => {
  it("summarizes indicator workflow states with exact status totals", () => {
    expect(indicatorList).toContain('"Indikator terdaftar"');
    expect(indicatorList).toContain('"Draf"');
    expect(indicatorList).toContain('"Menunggu pemeriksaan"');
    expect(indicatorList).toContain('"Terbit"');
    expect(indicatorList).toContain(
      'data.filter((item) => item.status === "draft")',
    );
    expect(indicatorList).toContain(
      'data.filter((item) => item.status === "review")',
    );
    expect(indicatorList).toContain(
      'data.filter((item) => item.status === "published")',
    );
    expect(indicatorList.match(/portalApi\(/g)).toHaveLength(4);
    expect(indicatorList).toContain(
      'portalApi("indicators?status=draft&limit=1")',
    );
    expect(indicatorList).toContain(
      'portalApi("indicators?status=review&limit=1")',
    );
    expect(indicatorList).toContain(
      'portalApi("indicators?status=published&limit=1")',
    );
    expect(indicatorList).toContain(
      'aria-labelledby="indicator-workflow-title"',
    );
    expect(indicatorList).toContain("Kelola nilai & tren");
    expect(indicatorList).toContain('caption="Daftar indikator statistik"');
  });

  it("keeps definition changes discoverable from observation management without a review-state dead end", () => {
    expect(indicatorObservations).toContain("Ubah definisi indikator");
    expect(indicatorObservations).toContain("<IndicatorObservationManager");
    expect(indicatorObservations).toContain("Informasi integrasi API");
    expect(indicatorObservations).toContain("Ringkasan status nilai indikator");
    expect(indicatorObservations).toContain("Lihat tren publik");
    expect(indicatorObservations).toContain(
      "canEdit && !indicatorInReview && !indicatorArchived",
    );
    expect(indicatorObservations).toContain("Menunggu pemeriksaan definisi");
    expect(indicatorObservations).toContain(
      "Definisi sedang dalam pemeriksaan. Nilai yang disiapkan tetap sebagai draf",
    );
  });
});

describe("dataset and indicator actions align with workflow preconditions", () => {
  it("does not enable dataset review submission until source and latest validation pass", () => {
    expect(datasetDetail).toContain(
      "const validationRun = data.validation_run || null",
    );
    expect(datasetDetail).toContain(
      `const validationPassed = validationRun?.status === "passed"`,
    );
    expect(datasetDetail).toContain("const reviewRequirementsComplete =");
    expect(datasetDetail).toContain(
      "workSourceReady && validationPassed && missingReviewMetadata.length === 0",
    );
    expect(datasetDetail).toContain(
      "const maySubmitForReview = hasEditableWorkDraft && reviewRequirementsComplete",
    );
    expect(datasetDetail).toContain("disabled={!maySubmitForReview}");
    expect(datasetDetail).toContain("validation_required");
    expect(datasetDetail).toContain("Berkas sumber selesai diproses");
  });

  it("hides dataset archive while the record is in review and offers reviewer return flow", () => {
    const archiveAction = read(
      "src/components/admin/dataset-archive-action.jsx",
    );
    const datasetActions = read(
      "src/app/portal/(workspace)/dataset/[id]/actions.js",
    );
    expect(archiveAction).toContain('["draft", "published"].includes(status)');
    expect(datasetDetail).toContain("returnDatasetForChangesAction");
    expect(datasetActions).toContain('action: "return_for_changes"');
    expect(datasetDetail).toContain('action_success === "review_returned"');
  });

  it("keeps indicator editing and archiving controls consistent with backend workflow", () => {
    const actions = read("src/components/admin/indicator-actions.jsx");
    const editPage = read(
      "src/app/portal/(workspace)/statistik/[id]/edit/page.jsx",
    );
    const controller = read(
      "backend/app/Http/Controllers/Api/PortalIndicatorController.php",
    );
    expect(actions).toContain('status === "published" && canEdit');
    expect(actions).toContain('status !== "archived" && canArchive');
    expect(editPage).toContain('if (indicator.status === "review") redirect');
    expect(controller).toContain(
      "Terbitkan definisi indikator terlebih dahulu sebelum menerbitkan nilai statistik.",
    );
    expect(controller).toContain(
      "$indicator->status !== 'published' || $indicator->published_at === null",
    );
    expect(controller).toContain(
      "Indikator sudah diarsipkan dan hanya dapat dilihat.",
    );
    expect(indicatorObservations).toContain(
      "canEdit={canEdit && !indicatorArchived}",
    );
  });
});

describe("tenant identity and frontend cookie configuration stay generic by default", () => {
  it("requires an explicit brand profile for Wajo-specific assets and PPID values", () => {
    const siteConfig = read("src/lib/site-config.js");
    const compose = read("docker-compose.yml");
    const dockerfile = read("Dockerfile");
    const exampleEnv = read(".env.example");
    expect(siteConfig).toContain(
      'process.env.NEXT_PUBLIC_BRAND_PROFILE || "generic"',
    );
    expect(siteConfig).toContain('configuredBrandProfile === "wajo"');
    expect(siteConfig).toContain("brandProfile: configuredBrandProfile");
    expect(compose).toContain(
      "NEXT_PUBLIC_BRAND_PROFILE: ${NEXT_PUBLIC_BRAND_PROFILE:-generic}",
    );
    expect(dockerfile).toContain("ARG NEXT_PUBLIC_BRAND_PROFILE=generic");
    expect(exampleEnv).toContain("NEXT_PUBLIC_BRAND_PROFILE=generic");
  });

  it("keeps visual and backend branding defaults generic when tenant values are absent", () => {
    const overrides = read("src/app/styles/overrides.css");
    const qualityPass = read("src/app/styles/quality-pass.css");
    const compose = read("docker-compose.yml");
    expect(overrides).toContain('url("/portal-social.svg")');
    expect(qualityPass).toContain('url("/portal-social.svg")');
    expect(overrides).not.toContain('url("/wajo-hero-panorama.webp")');
    expect(qualityPass).not.toContain('url("/wajo-hero-panorama.webp")');
    expect(compose).toContain(
      "APP_NAME: ${PORTAL_APP_NAME:-${NEXT_PUBLIC_APP_NAME:-Portal Satu Data API}}",
    );
  });

  it("promotes configured and legacy portal cookies before authentication middleware", () => {
    const bootstrap = read("backend/bootstrap/app.php");
    const currentTest = read(
      "backend/tests/Feature/FrontendCookieAuthenticationTest.php",
    );
    const middlewareTest = read(
      "backend/tests/Unit/AttachFrontendTokenTest.php",
    );
    const apiRoutes = read("backend/routes/api.php");
    expect(bootstrap).toContain("prepend(AttachFrontendToken::class)");
    expect(bootstrap).toContain("prependToPriorityList");
    expect(bootstrap).toContain("AuthenticatesRequests::class");
    expect(apiRoutes).toContain(
      "Route::middleware([\\App\\Http\\Middleware\\AttachFrontendToken::class, 'auth:sanctum'",
    );
    expect(currentTest).toContain(
      "withUnencryptedCookie('portal_session_token', $token)",
    );
    expect(currentTest).toContain("->withCredentials()");
    expect(middlewareTest).toContain(
      "test_legacy_wajo_cookie_is_accepted_when_a_generic_cookie_name_is_configured",
    );
  });
});
