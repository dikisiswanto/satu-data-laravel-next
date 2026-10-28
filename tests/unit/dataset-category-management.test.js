import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("dataset categories stay reusable and manageable", () => {
  it("offers configured suggestions but allows an existing or custom category", () => {
    const options = read("src/lib/dataset-options.js");
    const field = read("src/components/admin/dataset-category-field.jsx");
    expect(options).toContain("NEXT_PUBLIC_DATASET_CATEGORIES");
    expect(options).toContain("getDatasetCategoryOptions");
    expect(options).toContain("normalizeCategoryKey");
    expect(options).toContain('.normalize("NFKC")');
    expect(field).toContain("datalist");
    expect(field).toContain('name="category"');
    expect(field).toContain("ketik kategori baru");
  });

  it("lets admin filter datasets by existing category without another API request", () => {
    const page = read("src/app/portal/(workspace)/dataset/page.jsx");
    const controller = read(
      "backend/app/Http/Controllers/Api/PortalDatasetController.php",
    );
    expect(page).toContain('name="category"');
    expect(page).toContain('search.set("include_categories", "1")');
    expect(page).toContain("datasetResult.meta?.categories");
    expect(controller).toContain(
      "'include_categories' => ['sometimes', 'boolean']",
    );
    const compactController = controller.replace(/\s+/g, "");
    expect(compactController).toContain(
      "$categoryQuery->whereNotNull('category')",
    );
    expect(compactController).toContain(
      "$query->where('category',trim($request->string('category')->toString()))",
    );
  });

  it("includes category on draft creation and preserves metadata max length", () => {
    const form = read("src/components/admin/dataset-create-form.jsx");
    const controller = read(
      "backend/app/Http/Controllers/Api/PortalDatasetController.php",
    );
    const formField = read("src/components/admin/dataset-category-field.jsx");
    expect(form).toContain("category: raw.category?.trim() || null");
    expect(controller).toContain(
      "'category' => ['nullable', 'string', 'max:120']",
    );
    expect(formField).toContain("maxLength={120}");
  });
  it("passes category configuration to both the Next.js build and runtime", () => {
    const compose = read("docker-compose.yml");
    const dockerfile = read("Dockerfile");
    const envExample = read(".env.example");
    expect(compose).toContain(
      "NEXT_PUBLIC_DATASET_CATEGORIES: ${NEXT_PUBLIC_DATASET_CATEGORIES:-}",
    );
    expect(dockerfile).toContain("ARG NEXT_PUBLIC_DATASET_CATEGORIES=");
    expect(dockerfile).toContain(
      "NEXT_PUBLIC_DATASET_CATEGORIES=${NEXT_PUBLIC_DATASET_CATEGORIES}",
    );
    expect(envExample).toContain("NEXT_PUBLIC_DATASET_CATEGORIES=");
  });
});
