import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicController = readFileSync(
  new URL(
    "../../backend/app/Http/Controllers/Api/PublicDataController.php",
    import.meta.url,
  ),
  "utf8",
);
const organizationPage = readFileSync(
  new URL("../../src/app/(public)/organisasi/page.jsx", import.meta.url),
  "utf8",
);
const organizationData = readFileSync(
  new URL("../../src/lib/data/organizations.js", import.meta.url),
  "utf8",
);
const organizationCard = readFileSync(
  new URL("../../src/components/organization-directory.jsx", import.meta.url),
  "utf8",
);
const statisticsPage = readFileSync(
  new URL("../../src/app/(public)/statistik/page.jsx", import.meta.url),
  "utf8",
);
const datasetPage = readFileSync(
  new URL("../../src/app/(public)/dataset/page.jsx", import.meta.url),
  "utf8",
);
const datePicker = readFileSync(
  new URL("../../src/components/admin/date-picker.jsx", import.meta.url),
  "utf8",
);
const sharedTable = readFileSync(
  new URL("../../src/components/admin/portal-data-table.jsx", import.meta.url),
  "utf8",
);

describe("public empty states and consistent admin controls", () => {
  it("lists active organizations with or without published datasets while counting only published rows", () => {
    expect(publicController).toContain("->where('o.is_active', true)");
    expect(publicController).toContain("'published_dataset_count'");
    expect(publicController).toContain("count(distinct d.id)");
    expect(publicController).toContain("->where('r.is_public', true)");
    expect(organizationPage).toContain("getPublicOrganizationsResult");
    expect(organizationData).toContain("organization.published_dataset_count");
    expect(organizationData).toContain("dataset_count: datasetCount");
    expect(organizationCard).toContain("dataset_count");
    expect(organizationCard).toContain("dataset publik");
  });

  it("distinguishes an empty public result from a failed data service", () => {
    expect(statisticsPage).toContain("Indikator statistik belum dapat dimuat");
    expect(statisticsPage).toContain(
      "Belum ada indikator statistik yang dipublikasikan",
    );
    expect(datasetPage).toContain("Katalog dataset belum dapat ditampilkan");
    expect(datasetPage).toContain("Belum ada dataset yang diterbitkan");
  });

  it("uses a custom calendar picker and shared accessible table for admin forms and lists", () => {
    expect(datePicker).toContain("date-picker-popover");
    expect(datePicker).toContain("Hari ini");
    expect(datePicker).toContain("Bulan sebelumnya");
    expect(sharedTable).toContain("portal-data-table");
    expect(sharedTable).toContain("emptyTitle");
  });
});
