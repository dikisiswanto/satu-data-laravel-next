import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin workflows are grouped around the user's task", () => {
  it("separates indicator identity, meaning, and optional initial values", () => {
    const form = read("src/components/admin/indicator-form.jsx");
    const loading = read(
      "src/app/portal/(workspace)/statistik/baru/loading.jsx",
    );
    for (const heading of [
      "1. Identitas indikator",
      "2. Definisi dan pengampu",
      "3. Periode dan nilai awal (opsional)",
    ]) {
      expect(form).toContain(heading);
      expect(loading).toContain(heading);
    }
    expect(form).toContain("Simpan sebagai draf");
    expect(form).toContain("Draf belum tampil di portal publik.");
  });

  it("emphasizes required organization identity before optional contact details", () => {
    const form = read("src/components/admin/organization-form.jsx");
    for (const heading of [
      "1. Identitas organisasi",
      "2. Kontak dan informasi tambahan (opsional)",
    ]) {
      expect(form).toContain(heading);
      expect(
        read("src/app/portal/(workspace)/organisasi/baru/loading.jsx"),
      ).toContain(heading);
      expect(
        read("src/app/portal/(workspace)/organisasi/[id]/edit/loading.jsx"),
      ).toContain(heading);
    }
  });

  it("offers one focused user-access workflow at a time with accessible tabs", () => {
    const workspace = read("src/components/admin/user-access-workspace.jsx");
    const page = read("src/app/portal/(workspace)/pengguna/page.jsx");
    const loading = read("src/app/portal/(workspace)/pengguna/loading.jsx");
    expect(page).toContain(
      "<UserAccessWorkspace organizations={orgs || []} />",
    );
    expect(workspace).toContain('role="group"');
    expect(workspace).toContain("aria-pressed={selected}");
    expect(workspace).toContain("hasUnsavedInput");
    expect(workspace).toContain(
      "Formulir ini berisi isian yang belum disimpan.",
    );
    expect(workspace).toContain("Pengguna baru");
    expect(workspace).toContain("Akun sudah ada");
    expect(workspace).toContain("{selected ? (");
    expect(loading).toContain("Tambahkan pengguna atau akses");
  });
});
