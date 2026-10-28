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
    expect(workspace).toContain('form?.dataset.userModified === "true"');
    expect(workspace).toContain("Ada perubahan yang belum disimpan.");
    expect(read("src/components/admin/invite-user-form.jsx")).toContain(
      "onInputCapture",
    );
    expect(read("src/components/admin/membership-form.jsx")).toContain(
      "onChangeCapture",
    );
    expect(workspace).toContain("Undang akun baru");
    expect(workspace).toContain("Akun terdaftar");
    const membership = read("src/components/admin/membership-form.jsx");
    expect(membership).toContain('name="user_email"');
    expect(membership).not.toContain('name="user_id"');
    expect(
      read("backend/app/Http/Controllers/Api/PortalAdminController.php"),
    ).toContain("user_email");
    expect(workspace).toContain("{selected ? (");
    expect(loading).toContain("Tambah pengguna");
    expect(loading).toContain("akun yang sudah terdaftar");
  });

  it("uses an email instead of a technical user UUID when assigning existing-account access", () => {
    const form = read("src/components/admin/membership-form.jsx");
    const controller = read(
      "backend/app/Http/Controllers/Api/PortalAdminController.php",
    );
    const featureTest = read(
      "backend/tests/Feature/PortalMembershipByEmailTest.php",
    );
    expect(form).toContain('name="user_email"');
    expect(form).toContain('type="email"');
    expect(form).not.toContain('name="user_id"');
    expect(controller).toContain("LOWER(email) = ?");
    expect(controller).toContain(
      "Existing API clients may continue to send user_id",
    );
    expect(featureTest).toContain(
      "test_super_admin_can_add_existing_user_by_email",
    );
    expect(featureTest).toContain(
      "test_membership_api_keeps_support_for_existing_user_id_clients",
    );
    expect(form).toContain(
      'defaultValue={organizations.length === 1 ? organizations[0].id : ""}',
    );
    expect(form).toContain("Akses aktif");
  });
});
