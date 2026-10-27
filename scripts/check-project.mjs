import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const errors = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(ts|tsx)$/.test(entry.name)) errors.push(`TypeScript file is not allowed: ${path.relative(root, file)}`);
  }
}
await walk(path.join(root, "src"));
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (pkg.packageManager !== "npm@10.9.2") errors.push("packageManager must be npm@10.9.2");
if (!pkg.engines.node.includes("22.16.0") || !pkg.engines.node.includes("<25")) errors.push("Node engine must support Node 22 and 24 only");

for (const required of [
  "src/app/(public)/dataset/[slug]/page.jsx",
  "src/app/portal/login/page.jsx",
  "src/app/portal/layout.jsx",
  "src/lib/backend/server.js",
  "src/lib/backend/compat-server.js",
  "src/lib/backend/request-user.js",
  "src/lib/data/public.js",
  "src/components/source-upload-form.jsx",
  "src/components/query-provider.jsx",
  "src/components/portal-query-cache-guard.jsx",
  "src/components/dataset-resource-preview.jsx",
  "src/lib/api/query-keys.js",
  "backend/artisan",
  "backend/routes/api.php",
  "backend/app/Jobs/ProcessDatasetConversion.php",
  "backend/app/Console/Commands/ImportLegacySupabase.php",
  "backend/database/migrations/2026_10_01_000001_create_identity_and_organizations.php",
  "backend/database/migrations/2026_10_01_000002_create_dataset_workflow_tables.php",
  "backend/database/migrations/2026_10_01_000003_create_indicator_sdi_audit_tables.php",
  "backend/database/migrations/2026_10_26_000001_add_legacy_compatibility_columns.php",
  "backend/database/migrations/2026_10_26_000002_add_backend_query_indexes.php",
  "backend/database/migrations/2026_10_26_000003_expand_authorization_and_integrity_constraints.php",
  "backend/database/migrations/2026_10_26_000004_enforce_membership_scope_uniqueness.php",
  "backend/database/migrations/2026_10_27_000001_allow_progressive_dataset_drafts.php",
  "backend/tests/Feature/PortalIndicatorWorkflowTest.php",
  "backend/tests/Feature/ProgressiveDatasetDraftTest.php",
  "scripts/export-legacy-storage.mjs",
  "next.config.mjs",
  "Dockerfile",
  "docker-compose.yml",
  "deploy/laravel-nginx.conf",
  "deploy/edge-nginx.conf",
  "deploy/vps-host-nginx.example.conf",
  "scripts/deploy-vps.sh",
  "backend/openapi/openapi.json",
  "backend/openapi/openapi.yaml",
  "BACKEND-REWRITE-AUDIT.md",
  "ARCHITECTURE.md",
  "API-CONTRACTS.md",
  "backend/app/Models/Role.php",
  "backend/app/Models/Permission.php",
  "backend/tests/Feature/AuthorizationCatalogTest.php",
]) {
  try { await stat(path.join(root, required)); }
  catch { errors.push(`Missing required project file: ${required}`); }
}

const checks = [
  ["next.config.mjs", /source:\s*"\/api\/:path\*"[\s\S]*destination:\s*`\$\{backend\}\/api\/:path\*`/, "Next.js API routes must proxy to Laravel"],
  ["src/lib/backend/server.js", /wajo_portal_token/, "Next.js server requests must forward the Laravel session cookie"],
  ["src/lib/backend/server.js", /auth\s*=\s*true/, "Backend helper must support anonymous/public calls without forwarding portal tokens"],
  ["src/proxy.js", /wajo_portal_token/, "Portal route guard must use the Laravel token cookie"],
  ["src/app/robots.js", /disallow:\s*\[[^\]]*\"\/portal\"[^\]]*\"\/portal\/\"/, "Robots policy must disallow portal administration routes"],
  ["src/components/source-upload-form.jsx", /X-Upload-Token/, "Direct uploads must use the short-lived Laravel upload capability"],
  ["backend/app/Jobs/ProcessDatasetConversion.php", /assertJsonComplexityBounds|JSON_THROW_ON_ERROR/, "Conversion worker must reject malformed or overly complex JSON"],
  ["backend/app/Jobs/ProcessDatasetConversion.php", /hash_file\('sha256'/, "Conversion worker must verify the source checksum"],
  ["backend/app/Services/DatasetWorkflowService.php", /processed_resource_required/, "Publishing requires a successfully processed resource"],
  ["backend/app/Services/DatasetWorkflowService.php", /candidateMetadata[\s\S]*Lengkapi sebelum pemeriksaan/, "Review must validate publication-critical metadata against the exact candidate version snapshot"],
  ["backend/app/Http/Controllers/Api/PortalDatasetController.php", /traceable draft[\s\S]*'organization_id' => \['required'/, "Draft creation should require only a title and owning organization"],
  ["backend/app/Http/Middleware/RequireSameOriginForMutations.php", /Origin|Referer/, "Mutating API requests must check the source origin"],
  ["backend/app/Console/Commands/ImportLegacySupabase.php", /LEGACY_SUPABASE_DATABASE_URL/, "Legacy import must be an explicit operation against a separate source database"],
  ["backend/app/Console/Commands/ImportLegacySupabase.php", /dry-run/, "Legacy import must support a dry run"],
  ["backend/app/Http/Controllers/Api/PortalDatasetController.php", /hash_equals|token_hash/, "Binary upload must use an expiring, hashed capability token"],
  ["backend/app/Http/Controllers/Api/PublicDataController.php", /is_public/, "Public resource APIs must exclude private resources"],
  ["backend/app/Http/Controllers/Api/PublicDataController.php", /where\('dataset_resources\.is_source', false\)/, "Public APIs must never expose source-upload artifacts"],
  ["backend/app/Services/AccessService.php", /function organizationIdsWithPermission[\s\S]*hasPermission\(\$user, \$permissionCode\)/, "Authorization scope must distinguish global permission from no organization access"],
  ["backend/database/migrations/2026_10_26_000004_enforce_membership_scope_uniqueness.php", /membership_user_scope_role_strict_unique/, "Global memberships must be unique despite nullable organization IDs"],
  ["backend/app/Console/Commands/ImportLegacySupabase.php", /'dataset_versions'[\s\S]*'dataset_resources'[\s\S]*'sdi_standard_registry'[\s\S]*'reference_code_systems'[\s\S]*'dataset_sdi_metadata'/, "Legacy importer must load FK parents before dependent dataset and SDI rows"],
  ["backend/app/Http/Controllers/Api/PortalIndicatorController.php", /Indikator yang sedang ditinjau atau telah diarsipkan tidak dapat diedit langsung/, "Indicator edits must not mutate records in review or archived state"],
  ["src/app/portal/login/actions.js", /payload\?\.data\?\.expires_at[\s\S]*Math\.floor\(\(tokenExpiresAt - Date\.now\(\)\) \/ 1000\)/, "Frontend auth cookie lifetime must follow the Laravel token expiry"],
  ["backend/app/Http/Controllers/Api/PublicDataController.php", /whereNotNull\('category'\)->where\('category', '<>', ''\)/, "Category facets must exclude null and empty categories using a valid SQL predicate"],
  ["backend/app/Http/Controllers/Api/PublicDataController.php", /whereColumn\('dataset_resources\.dataset_version', 'd\.current_version'\)/, "Public dataset responses must eager-load only current-version resources to avoid historical resource overfetch"],
  ["backend/app/Http/Controllers/Api/PortalSdiController.php", /currentPublicResourcesFor[\s\S]*currentSdiMetadataFor/, "SDI exports must select only current-version resources and metadata in bounded queries"],
  ["backend/app/Http/Controllers/Api/PortalIndicatorController.php", /indicator\.observation_create[\s\S]*DB::transaction/, "Indicator observation creation and audit must be committed atomically"],
  ["backend/app/Http/Controllers/Api/PortalIndicatorController.php", /if \(\$action === 'publish' \|\| \(\$action === 'archive' && \$wasPublic\)\) \$this->catalogRevision->bump\(\)/, "Indicator catalog revision should change only when public visibility changes"],
  ["backend/app/Jobs/ProcessDatasetConversion.php", /assertOutputSize\('csv'[\s\S]*assertOutputSize\('geojson'/, "Conversion must bound each output before building subsequent artifacts"],
  ["backend/app/Jobs/ProcessDatasetConversion.php", /conversion_output_write_failed/, "Conversion must check object-storage writes rather than ignoring failures"],
  ["backend/app/Rules/MaxPasswordBytes.php", /strlen\(\$value\) > \$this->maxBytes/, "Bcrypt passwords must be limited by bytes, not Unicode character count"],
  ["backend/config/hashing.php", /'limit' => 72/, "Bcrypt byte limit must be explicit in application hashing config"],
  ["backend/app/Providers/AppServiceProvider.php", /RateLimiter::for\('portal-user'[\s\S]*user:/, "Authenticated portal routes need per-user throttling in addition to IP throttling"],
  ["deploy/edge-nginx.conf", /map \$http_cf_connecting_ip \$client_real_ip[\s\S]*limit_conn per_ip_conn 20/, "Proxy edge must key abuse limits by real visitor IP and cap concurrent connections"],
  ["backend/.env.example", /PRIVATE_STORAGE_PATH/, "Uploaded source files must use private storage by default"],
  ["backend/config/filesystems.php", /PRIVATE_STORAGE_PREFIX/, "S3 object storage must not inherit local filesystem paths as key prefixes"],
  ["docker-compose.yml", /database-data:[\s\S]*app-storage:/, "The full production stack must persist MariaDB and file storage in named volumes"],
  ["docker-compose.yml", /cloudflared:[\s\S]*profiles:\s*\[tunnel\]/, "Cloudflare Tunnel must remain an optional profile, not a requirement for standard deployments"],
  ["deploy/edge-nginx.conf", /limit_req_zone[\s\S]*api_auth[\s\S]*limit_req_status 429/, "Edge proxy must enforce per-IP rate limits for API and authentication traffic"],
  ["src/app/styles/admin-console.css", /prefers-reduced-motion/, "Admin console must respect reduced-motion accessibility preferences"],
  ["src/app/styles/admin-design-system.css", /portal-page-heading/, "Admin pages must use the shared page-heading styles"],
  ["src/app/styles/admin-design-system.css", /portal-mobile-navigation-panel/, "Admin pages must use the responsive navigation styles"],
  ["src/components/portal-navigation.jsx", /item\.roles\.some/, "Admin navigation must hide menu items outside the active account roles"],
  ["src/components/portal-shell.jsx", /portal-topbar sticky top-0[\s\S]*lg:sticky lg:top-\[100px\]/, "Admin shell and sidebar must remain persistent while navigating desktop pages"],
  ["src/components/admin/dataset-create-form.jsx", /Judul dataset[\s\S]*required[\s\S]*organization_id[\s\S]*Lengkapi informasi data[\s\S]*opsional saat membuat draf/, "Dataset creation should keep the minimum draft form short and progressive"],
  ["docker-compose.yml", /NEXT_PUBLIC_SITE_URL:[\s\S]*?NEXT_PUBLIC_GEOPORTAL_URL/, "Next.js public configuration must be passed as Docker build arguments"],
  ["Dockerfile", /ARG NEXT_PUBLIC_SITE_URL[\s\S]*ENV BACKEND_API_URL=\$\{BACKEND_API_URL\}[\s\S]*NEXT_PUBLIC_SITE_URL=\$\{NEXT_PUBLIC_SITE_URL\}/, "NEXT_PUBLIC settings must be available when Next.js builds static/server bundles"],
  ["backend/routes/api.php", /Route::get\('\/openapi\.yaml'/, "Laravel must serve OpenAPI YAML"],
  ["src/components/dataset-resource-preview.jsx", /useQuery\(/, "Public paginated previews must use React Query cache and cancellation"],
  ["src/components/dataset-resource-preview.jsx", /row\.row \?\? row\.values/, "Public preview tables must read the canonical Laravel row payload while tolerating the former shape"],
  ["src/components/dataset-resource-preview.jsx", /typeof column === "string"/, "Public preview tables must normalize both string and object column schemas"],
  ["backend/app/Http/Controllers/Api/PublicDataController.php", /where\('resource_id', \$resourceId\)->count\(\)/, "Public preview pagination must count stored preview rows instead of original rows"],  ["backend/app/Http/Controllers/Api/PublicDataController.php", /DB::table\('organizations'\)->where\('is_active', true\)->count\(\)/, "Homepage active-organization total must match the public organization directory"],

  ["backend/app/Http/Controllers/Api/PublicDataController.php", /page_out_of_range/, "Public preview API must reject page numbers outside its stored preview range"],
  ["src/app/(public)/api-data/page.jsx", /organizations\/\{slug\}/, "Public API docs must include direct organization detail lookup"],
  ["src/app/(public)/api-data/page.jsx", /api\/openapi\.yaml/, "Public API docs must describe JSON and YAML OpenAPI endpoints"],
  ["src/lib/data/organizations.js", /rawLastPage[\s\S]*maxPages/, "Public organization directory must follow pagination instead of silently stopping at 100 entries"],
  ["src/app/sitemap.js", /getSitemapIndicators[\s\S]*statistik\/\$\{item\.slug\}/, "Public indicator detail pages must be included in the sitemap"],
  ["src/app/(public)/statistik/[slug]/page.jsx", /serializeJsonLd[\s\S]*GovernmentOrganization/, "Public indicator details must expose safe structured metadata"],
  ["src/app/layout.jsx", /wajo-hero-panorama\.webp/, "Root metadata must configure a social preview image"],
  ["src/components/portal-query-cache-guard.jsx", /removeQueries/, "Private query cache must be cleared on portal logout/navigation to login"],
  ["src/lib/backend/compat-server.js", /requestedLimit > 500/, "Legacy server components must not silently truncate requests over the 500-row API page size"],
  ["src/lib/backend/compat-server.js", /indicatorId \? `\/api\/v1\/portal\/indicators\/\$\{encodeURIComponent\(indicatorId\)\}`/, "Indicator ID lookups must use the dedicated detail endpoint"],
  ["backend/app/Http/Controllers/Api/PortalIndicatorController.php", /function show\(Request \$request, string \$id\)/, "Portal indicators must support an authorized detail endpoint"],
  ["backend/app/Http/Controllers/Api/PortalDatasetController.php", /include_sdi_metadata[\s\S]*dataset_sdi_metadata/, "SDI readiness screen must receive metadata and referenced registries from the backend"],
  ["backend/database/migrations/2026_10_01_000003_create_indicator_sdi_audit_tables.php", /Schema::create\('reference_code_entries'[\s\S]*boolean\('is_active'\)/, "Reference code entries must retain the legacy activation state"],
  ["backend/database/migrations/2026_10_26_000001_add_legacy_compatibility_columns.php", /reviewed_at[\s\S]*is_active/, "Existing MariaDB installations must receive additive legacy compatibility columns"],
  ["src/components/source-upload-form.jsx", /invalidateQueries\(\{ queryKey: portalQueryKeys\.datasets\(\) \}\)/, "Upload must invalidate cached dataset lists as well as detail"],
];
for (const [file, pattern, message] of checks) {
  const text = await readFile(path.join(root, file), "utf8").catch(() => "");
  if (!pattern.test(text)) errors.push(message);
}

const routesSource = await readFile(path.join(root, "backend/routes/api.php"), "utf8");
const canonicalRoutesSource = routesSource.split("// Canonical versioned API aliases.")[1] || "";
if (!/Route::get\('\/indicators\/\{id\}', \[PortalIndicatorController::class, 'show'\]\)/.test(canonicalRoutesSource)) {
  errors.push("The documented indicator detail endpoint must be registered in the canonical v1 route group");
}
if (!/Route::post\('\/indicators\/\{id\}\/workflow', \[PortalIndicatorController::class, 'action'\]\)/.test(canonicalRoutesSource)) {
  errors.push("Indicator workflow actions must have a semantic canonical endpoint");
}
if (!/Route::patch\('\/indicators\/\{id\}\/observations\/\{observationId\}', \[PortalIndicatorController::class, 'publishObservation'\]\)/.test(canonicalRoutesSource)) {
  errors.push("Observation publication must address the specific observation resource");
}

const manifest = JSON.parse(await readFile(path.join(root, "backend/openapi/openapi.json"), "utf8"));
if (manifest.openapi !== "3.1.0") errors.push("OpenAPI manifest must remain OpenAPI 3.1.0");
if (manifest.paths["/api/v1/portal/datasets"]?.post?.requestBody?.content?.["application/json"]?.schema?.$ref !== "#/components/schemas/DatasetDraftCreateRequest") errors.push("Draft create endpoint must publish its lightweight request contract");
if (JSON.stringify(manifest.components?.schemas?.DatasetDraftCreateRequest?.required || []) !== JSON.stringify(["title", "organization_id"])) errors.push("Draft create schema must require only title and organization");
if (!manifest.paths["/api/v1/organizations/{slug}"]?.get) errors.push("OpenAPI contract is missing public organization detail");
for (const path of ["/api/openapi", "/api/openapi.json", "/api/openapi.yaml"]) {
  if (!manifest.paths[path]?.get) errors.push(`OpenAPI document endpoint is missing from specification: ${path}`);
}
if (!manifest.paths["/api/v1/datasets/{slug}/resources/{resourceId}/rows"]?.get?.responses?.["400"]) errors.push("OpenAPI preview endpoint must document out-of-range pages");

for (const [route, expectedParams] of Object.entries({
  "/api/v1/portal/datasets": ["q", "statuses", "organization_ids", "created_from", "created_to", "include_sdi_metadata", "limit", "offset", "sort"],
  "/api/v1/portal/indicators": ["q", "statuses", "organization_ids", "limit", "offset", "sort"],
})) {
  const queryParameters = new Set((manifest.paths[route]?.get?.parameters || []).map((parameter) => parameter.name));
  for (const name of expectedParams) if (!queryParameters.has(name)) errors.push(`OpenAPI list contract is missing ${name}: ${route}`);
}
if (!manifest.components?.schemas?.PaginatedListResponse?.properties?.meta?.properties?.total) errors.push("OpenAPI pagination contract must define meta.total");
if (manifest.paths["/api/v1/portal/indicators/{id}"]?.post?.deprecated !== true) errors.push("Legacy indicator workflow alias must be deprecated in OpenAPI");
if (manifest.paths["/api/v1/portal/indicators/{id}/observations"]?.patch?.deprecated !== true) errors.push("Legacy observation publication alias must be deprecated in OpenAPI");
for (const endpoint of [
  "/api/v1/datasets",
  "/api/v1/portal/datasets/{id}/uploads",
  "/api/v1/portal/audit-logs",
  "/api/v1/portal/data-quality/summary",
  "/api/v1/portal/sdi/registry/entries",
  "/api/v1/portal/integrations/preflight",
  "/api/v1/portal/indicators/{id}",
  "/api/v1/portal/indicators/{id}/workflow",
  "/api/v1/portal/indicators/{id}/observations/{observationId}",
]) {
  if (!manifest.paths[endpoint]) errors.push(`OpenAPI contract is missing canonical endpoint: ${endpoint}`);
}
const operationIds = Object.entries(manifest.paths).flatMap(([route, methods]) => Object.entries(methods)
  .filter(([method]) => ["get", "post", "put", "patch", "delete"].includes(method))
  .map(([method, operation]) => ({ route, method, id: operation.operationId })));
const seenOperationIds = new Set();
for (const op of operationIds) {
  if (!op.id) errors.push(`OpenAPI operationId missing: ${op.method.toUpperCase()} ${op.route}`);
  else if (seenOperationIds.has(op.id)) errors.push(`Duplicate OpenAPI operationId: ${op.id}`);
  else seenOperationIds.add(op.id);
}

const activeSourceFiles = [];
async function walkSource(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkSource(file);
    else if (/\.(js|jsx)$/.test(entry.name)) activeSourceFiles.push(file);
  }
}
await walkSource(path.join(root, "src"));
for (const file of activeSourceFiles) {
  const text = await readFile(file, "utf8");
  if (/from\s+["']@supabase\//.test(text)) errors.push(`Supabase runtime SDK import remains in frontend: ${path.relative(root, file)}`);
  if (/from\s+["']@\/lib\/supabase\//.test(text)) errors.push(`Legacy Supabase runtime import remains in frontend: ${path.relative(root, file)}`);
}

const backendPhpFiles = [];
async function walkBackendApp(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkBackendApp(file);
    else if (entry.name.endsWith(".php")) backendPhpFiles.push(file);
  }
}
await walkBackendApp(path.join(root, "backend/app"));
for (const file of backendPhpFiles) {
  const text = await readFile(file, "utf8");
  if (/\benv\s*\(/.test(text)) errors.push(`Runtime env() call found outside config: ${path.relative(root, file)}`);
}
const portalAdminSource = await readFile(path.join(root, "backend/app/Http/Controllers/Api/PortalAdminController.php"), "utf8");
if (/password'\s*=>\s*Str::random\(/.test(portalAdminSource) && !/'password'\s*=>\s*'hashed'/.test(await readFile(path.join(root, "backend/app/Models/User.php"), "utf8"))) errors.push("Temporary invitation passwords must be hashed by the User model cast");
const workflowService = await readFile(path.join(root, "backend/app/Services/DatasetWorkflowService.php"), "utf8");
if (!/lockForUpdate\(\)/.test(workflowService) || !/permissionForAction/.test(workflowService) || !/requirePermissionInOrganization/.test(workflowService)) errors.push("Dataset workflows must re-check permission and status under row locks");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Project checks passed: v6 architecture docs, normalized access catalog, Next.js/Laravel contract, and no active Supabase SDK imports.");
