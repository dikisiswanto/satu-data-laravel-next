import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("consistent admin search, filters and date selection", () => {
  const datasetPage = read("src/app/portal/dataset/page.jsx");
  const explorer = read("src/components/admin/portal-data-table-explorer.jsx");
  const datePicker = read("src/components/admin/date-picker.jsx");
  const styles = read("src/app/styles/overrides.css");
  const calendarStyles = read("src/app/styles/component-styles.css");
  const createDatasetForm = read(
    "src/components/admin/dataset-create-form.jsx",
  );
  const datasetDetailPage = read("src/app/portal/dataset/[id]/page.jsx");
  const dataTable = read("src/components/admin/portal-data-table.jsx");
  const tableExplorer = read(
    "src/components/admin/portal-data-table-explorer.jsx",
  );

  it("uses the dataset filter form visual system for all shared admin tables", () => {
    expect(explorer).toContain(
      'className="portal-filter-form portal-table-explorer-toolbar"',
    );
    expect(explorer).toContain('className="portal-filter-search"');
    expect(explorer).toContain('className="field pl-9"');
    expect(explorer).toContain('className="portal-filter-actions"');
    expect(styles).toContain(
      ".portal-app .portal-main .portal-filter-form .field",
    );
  });

  it("uses the same accessible calendar picker for dataset and table date filters", () => {
    expect(datasetPage).toContain(
      'import { DatePicker } from "@/components/admin/date-picker"',
    );
    expect(datasetPage).toContain('id="dataset-created-from"');
    expect(datasetPage).toContain('id="dataset-created-to"');
    expect(explorer.match(/<DatePicker/g)).toHaveLength(2);
    expect(explorer).toContain("onValueChange={setDateFrom}");
    expect(explorer).toContain("onValueChange={setDateTo}");
    expect(datePicker).toContain('aria-haspopup="dialog"');
    expect(datePicker).toContain("onValueChange?.(iso)");
    expect(datePicker).toContain("disabled={!isDateAllowed(iso)}");
    expect(calendarStyles).toContain(".date-picker-day:disabled");
  });

  it("uses a searchable, keyboard-accessible organization picker on the create-dataset form", () => {
    expect(createDatasetForm).toContain(
      "function SearchableOrganizationSelect",
    );
    expect(createDatasetForm).toContain('role="combobox"');
    expect(createDatasetForm).toContain('aria-autocomplete="list"');
    expect(createDatasetForm).toContain('role="listbox"');
    expect(createDatasetForm).toContain('event.key === "ArrowDown"');
    expect(createDatasetForm).toContain('event.key === "ArrowUp"');
    expect(createDatasetForm).toContain('event.key === "Enter"');
    expect(createDatasetForm).toMatch(
      /name="organization_id"[\s\S]*?value={selectedOrganizationId}/,
    );
    expect(createDatasetForm).toContain(
      "!orgs.some((organization) => organization.id === raw.organization_id)",
    );
  });

  it("gives version history the same search, status filter and date-picker controls", () => {
    expect(datasetDetailPage).toContain('caption="Riwayat versi dataset"');
    expect(datasetDetailPage).toContain(
      'searchPlaceholder="Cari versi, ringkasan perubahan, sumber, atau status…"',
    );
    expect(datasetDetailPage).toContain('dateFilterLabel="Tanggal dibuat"');
    expect(datasetDetailPage).toContain(
      'alwaysShowFilters={["version_status"]}',
    );
    expect(dataTable).toContain(
      '{ key: "version_status", label: "Status versi" }',
    );
    expect(tableExplorer).toContain("alwaysShowFilters = []");
    expect(tableExplorer).toContain(
      "alwaysShowFilters.includes(definition.key)",
    );
    expect(dataTable).toContain('superseded: "Versi terdahulu"');
    expect(dataTable).toContain('abandoned: "Dibatalkan"');
  });

  it("keeps date ranges constrained and preserves instant filtering and reset", () => {
    expect(explorer).toContain("max={dateTo || undefined}");
    expect(explorer).toContain("min={dateFrom || undefined}");
    expect(explorer).toContain("const clearFilters = () =>");
    expect(explorer).toContain('setDateFrom("")');
    expect(explorer).toContain('setDateTo("")');
    expect(datasetPage).toContain("max={createdTo || undefined}");
    expect(datasetPage).toContain("min={createdFrom || undefined}");
  });
});
