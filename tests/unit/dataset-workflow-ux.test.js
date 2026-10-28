import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("guided dataset workflow UX", () => {
  it("explains the same five-step lifecycle during draft creation and dataset detail", () => {
    const guide = read("src/components/admin/dataset-lifecycle-guide.jsx");
    const create = read("src/app/portal/(workspace)/dataset/new/page.jsx");
    const detail = read("src/app/portal/(workspace)/dataset/[id]/page.jsx");
    for (const title of [
      "Buat draf",
      "Unggah berkas sumber",
      "Validasi otomatis",
      "Lengkapi metadata kepatuhan",
      "Ajukan dan terbitkan",
    ])
      expect(guide).toContain(title);
    expect(create).toContain("<DatasetLifecycleGuide");
    expect(detail).toContain("<DatasetLifecycleGuide");
    expect(detail).toContain("Kelengkapan sebelum pemeriksaan");
    expect(detail).toContain("!workSourceExists || workSourceFailed");
  });

  it("makes incremental draft metadata optional in the form and API", () => {
    const form = read("src/components/admin/dataset-metadata-form.jsx");
    const createForm = read("src/components/admin/dataset-create-form.jsx");
    const controller = read(
      "backend/app/Http/Controllers/Api/PortalDatasetController.php",
    );
    const workflow = read("backend/app/Services/DatasetWorkflowService.php");
    expect(form).toContain("2. Klasifikasi, sumber, dan periode");
    expect(form).toContain("3. Metode dan kepatuhan SDI");
    expect(form).toContain("wajib sebelum pemeriksaan");
    expect(createForm).toContain("opsional saat draf");
    for (const fieldLabel of [
      "Nama sumber data (wajib sebelum pemeriksaan)",
      "Cakupan wilayah (wajib sebelum pemeriksaan)",
      "Lisensi / ketentuan penggunaan (wajib sebelum pemeriksaan)",
    ]) {
      expect(createForm).toContain(fieldLabel);
    }
    expect(createForm).toContain("wajib sebelum pemeriksaan");
    expect(form).not.toMatch(/name="source_name"[\s\S]{0,180}required/);
    expect(controller).toContain(
      "'source_name' => ['nullable', 'string', 'min:2', 'max:240']",
    );
    expect(controller).toContain(
      "'geographic_scope' => ['nullable', 'string', 'min:2', 'max:240']",
    );
    expect(workflow).toContain("Lengkapi sebelum pemeriksaan:");
    expect(workflow).toContain("'source_name' => $stringValue('source_name')");
    expect(workflow).toContain("$this->nullableTrim($data[$key])");
  });

  it("checks source extension and size before sending any upload request", () => {
    const upload = read("src/components/source-upload-form.jsx");
    expect(upload).toContain("25 * 1024 * 1024");
    expect(upload).toContain("allowedExtensions.has(extension)");
    expect(upload).toContain("function handleFileSelection(event)");
    expect(upload).toContain('id="dataset-source-upload"');
    expect(upload).toContain("Tahapan unggah berkas");
    expect(upload).toContain("Ganti berkas");
    expect(upload).not.toContain('href="/templates/metadata-dataset.json"');
  });
});

describe("incremental dataset metadata API contract", () => {
  it("documents draft metadata as incremental while preserving review requirements", () => {
    const openapi = JSON.parse(read("backend/openapi/openapi.json"));
    const patch = openapi.paths["/api/v1/portal/datasets/{id}"].patch;
    const schemaRef = patch.requestBody.content["application/json"].schema.$ref;
    expect(schemaRef).toBe("#/components/schemas/DatasetMetadataPatchRequest");
    const schema = openapi.components.schemas.DatasetMetadataPatchRequest;
    expect(schema.required).toEqual(["title"]);
    for (const field of [
      "description",
      "source_name",
      "geographic_scope",
      "license_text",
      "update_frequency",
    ]) {
      expect(schema.properties[field].type).toContain("null");
    }
    const workflow = read("backend/app/Services/DatasetWorkflowService.php");
    expect(workflow).toContain("Lengkapi sebelum pemeriksaan:");
  });
});
