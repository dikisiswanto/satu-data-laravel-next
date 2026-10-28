import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const table = readFileSync(
  new URL("../../src/components/admin/portal-data-table.jsx", import.meta.url),
  "utf8",
);
const explorer = readFileSync(
  new URL(
    "../../src/components/admin/portal-data-table-explorer.jsx",
    import.meta.url,
  ),
  "utf8",
);
const auditPage = readFileSync(
  new URL("../../src/app/portal/(workspace)/riwayat/page.jsx", import.meta.url),
  "utf8",
);
const auditDetail = readFileSync(
  new URL(
    "../../src/components/admin/audit-log-detail-dialog.jsx",
    import.meta.url,
  ),
  "utf8",
);
const auditController = readFileSync(
  new URL(
    "../../backend/app/Http/Controllers/Api/PortalAdminController.php",
    import.meta.url,
  ),
  "utf8",
);
const auditSchema = readFileSync(
  new URL(
    "../../backend/database/migrations/2026_10_01_000003_create_indicator_sdi_audit_tables.php",
    import.meta.url,
  ),
  "utf8",
);
const styles = readFileSync(
  new URL("../../src/app/styles/admin-table-explorer.css", import.meta.url),
  "utf8",
);

describe("administrative table exploration and audit accountability", () => {
  it("adds reusable client search, categorical filters, date range and filtered row counts", () => {
    expect(table).toContain("PortalDataTableExplorer");
    expect(table).toContain("FILTER_SPECS");
    expect(explorer).toContain('type="search"');
    expect(explorer).toContain('from "@/components/admin/date-picker"');
    expect(explorer).toContain("<DatePicker");
    expect(explorer).toContain(
      'className="portal-filter-form portal-table-explorer-toolbar"',
    );
    expect(explorer).toContain("filteredIndices");
    expect(explorer).toContain("Menampilkan");
    expect(explorer).toContain("Hapus semua filter");
  });

  it("provides audit actor, action, object, organization, WITA timestamp and outcome", () => {
    expect(auditPage).toContain("actor_user_id");
    expect(auditPage).toContain("actor_display_name");
    expect(auditPage).toContain("organization_name");
    expect(auditPage).toContain("Waktu (WITA)");
    expect(auditDetail).toContain("request_id");
    expect(auditPage).toContain("outcomeLabels");
    expect(auditPage).toContain('portalData("audit-logs?limit=500")');
    expect(auditController).toContain("limit(min(500");
  });

  it("opens audit details in an accessible dialog and shows changed fields", () => {
    expect(auditPage).toContain("AuditLogDetailDialog");
    expect(auditDetail).toContain('aria-haspopup="dialog"');
    expect(auditDetail).toContain("dialog.showModal()");
    expect(auditDetail).toContain("Bagian yang berubah");
    expect(auditDetail).toContain("changed_fields");
    expect(auditController).toContain("json_decode($row->summary, true)");
  });

  it("enforces audit role checks and organization scope in the Laravel API", () => {
    expect(auditController).toContain(
      "requireAnyRole($user, ['super_admin', 'data_admin', 'admin_opd', 'reviewer', 'auditor'])",
    );
    expect(auditController).toContain(
      "whereIn('a.organization_id', $organizationIds)",
    );
    expect(auditController).toContain("accessibleOrganizationIds($user)");
    expect(auditController).toContain("'a.request_id'");
    expect(auditController).toContain("Cache-Control' => 'private, no-store");
    expect(auditController).toContain("Cache-Control' => 'private, no-store");
    expect(auditSchema).toContain("Schema::create('audit_logs'");
    expect(auditSchema).toContain(
      "foreignUuid('actor_user_id')->nullable()->constrained('users')->nullOnDelete()",
    );
  });

  it("styles the shared controls for readable, responsive filter layouts", () => {
    expect(styles).toContain(".portal-table-explorer-toolbar");
    expect(styles).toContain(".portal-table-filter select");
    expect(styles).toContain(".portal-audit-insight-grid");
  });
});
