import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("progressive dataset draft UX contract", () => {
  it("keeps only title and owning organization required at draft creation", () => {
    const form = read("src/components/admin/dataset-create-form.jsx");
    const api = read("backend/app/Http/Controllers/Api/PortalDatasetController.php");
    expect(form).toContain('name="title"');
    expect(form).toContain('name="organization_id"');
    expect(form).toContain("opsional saat membuat draf");
    expect(form).not.toMatch(/name="source_name"[\s\S]{0,180}required/);
    expect(api).toContain("Draf yang dapat ditelusuri harus mudah dibuat");
  });

  it("keeps SDI metadata advanced and validates publication-critical fields at review", () => {
    const form = read("src/components/admin/sdi-metadata-fields.jsx");
    const workflow = read("backend/app/Services/DatasetWorkflowService.php");
    expect(form).toContain("Bisa dilengkapi setelah draf");
    expect(workflow).toContain("candidateMetadata");
    expect(workflow).toContain("Lengkapi sebelum pemeriksaan");
    expect(workflow).toContain("validation_required_before_review");
  });

  it("keeps navigation persistent through the shared admin shell", () => {
    const shell = read("src/components/portal-shell.jsx");
    expect(shell).toContain("portal-topbar sticky top-0");
    expect(shell).toContain("lg:sticky lg:top-[100px]");
    expect(shell).toContain("<PortalNavigation roles={roles} />");
  });
});
