import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const compact = (source) => source.replace(/\s+/g, " ").trim();

describe("human-centered wording across public and admin UI", () => {
  it("explains common API errors and gives a safe next step", () => {
    const errors = read("src/lib/api/error-message.js");
    expect(errors).toContain(
      "Ada isian yang perlu diperbaiki. Periksa kolom yang ditandai",
    );
    expect(errors).toContain(
      "Periksa detail dataset sebelum mengunggahnya lagi agar tidak membuat duplikat.",
    );
    expect(errors).toContain(
      "Perubahan mungkin sudah tersimpan; muat ulang halaman dan periksa statusnya sebelum mengirim ulang.",
    );
  });

  it("provides examples before form submission and specific validation guidance", () => {
    const guidance = read("src/components/admin/form-field-guidance.jsx");
    expect(guidance).toContain(
      "Contoh: Jumlah Sekolah Menurut Kecamatan, 2025.",
    );
    expect(guidance).toContain(
      "Tanggal akhir harus sama dengan atau setelah tanggal mulai.",
    );
    expect(guidance).toContain(
      "Periksa petunjuk di bawah kolom ini, lalu sesuaikan isian Anda.",
    );
  });

  it("describes local SDI readiness without claiming national acceptance", () => {
    const integration = read("src/app/portal/(workspace)/integrasi/page.jsx");
    const metadataEditor = read("src/components/admin/sdi-metadata-editor.jsx");
    expect(integration).toContain(
      "hasil ini belum berarti katalog sudah diterima oleh SPLP atau katalog nasional",
    );
    expect(integration).toContain("Pemeriksaan lokal lulus");
    expect(metadataEditor).toContain(
      "belum berarti SPLP/SDI sudah menerima katalog",
    );
    expect(integration).not.toContain("Lulus preflight");
  });

  it("uses respectful, actionable guidance for upload and conversion status", () => {
    const upload = read("src/components/source-upload-form.jsx");
    const conversion = read("src/components/admin/conversion-job-status.jsx");
    expect(upload).toContain("Periksa halaman dataset terlebih dahulu");
    expect(upload).toContain("agar tidak membuat berkas ganda");
    expect(conversion).toContain("Anda tidak perlu mengunggahnya lagi");
    expect(conversion).toContain("Berkas tetap tercatat dalam antrean");
  });

  it("uses the updated, human-facing wording for account access and changed data", () => {
    const login = compact(read("src/app/portal/(auth)/login/page.jsx"));
    const users = compact(read("src/app/portal/(workspace)/pengguna/page.jsx"));
    const membership = compact(
      read("src/components/admin/membership-form.jsx"),
    );
    const accountSettings = compact(
      read("src/app/portal/(workspace)/pengaturan/page.jsx"),
    );
    const editDataset = compact(
      read("src/app/portal/(workspace)/dataset/[id]/edit/page.jsx"),
    );
    const createDataset = compact(
      read("src/app/portal/(workspace)/dataset/new/page.jsx"),
    );
    const createForm = compact(
      read("src/components/admin/dataset-create-form.jsx"),
    );
    const preparationAssistant = compact(
      read("src/components/admin/dataset-preparation-assistant.jsx"),
    );

    expect(login).toContain(
      "Portal Admin hanya dapat digunakan oleh akun yang diundang administrator.",
    );
    expect(login).not.toContain("memiliki kewenangan");
    expect(users).toContain('title="Pengguna dan akses"');
    expect(users).toContain("Daftar akses");
    expect(users).not.toContain("Daftar kewenangan");
    expect(membership).toContain("Tambahkan akses pengguna");
    expect(membership).toContain("Simpan akses");
    expect(accountSettings).toContain('"Aktif"');
    expect(accountSettings).toContain('"Belum diketahui"');
    expect(accountSettings).not.toContain(
      "Terkonfirmasi melalui sesi autentikasi",
    );
    expect(editDataset).toContain(
      "Data mungkin sudah berubah sejak halaman ini dibuka.",
    );
    expect(editDataset).not.toContain("bertentangan dengan data");
    expect(createDataset).toContain(
      "Informasi berubah saat formulir sedang disimpan.",
    );
    expect(createDataset).not.toContain(
      "Pembuatan dataset bertentangan dengan data",
    );
    expect(createForm).toContain(
      "Pilih organisasi pengampu yang aktif dan menjadi tanggung jawab Anda.",
    );
    expect(createForm).not.toContain("sesuai kewenangan Anda");
    expect(preparationAssistant).toContain(
      "sesuai tugas dan aturan akses yang berlaku",
    );
    expect(preparationAssistant).not.toContain("sesuai kewenangan");
  });

  it("documents and enforces the shared admin UI contract in source", () => {
    const designSystem = read("src/app/styles/admin-design-system.css");
    const pageHeading = read("src/components/portal-page-heading.jsx");
    const navigation = read("src/components/portal-navigation.jsx");
    expect(designSystem).toContain(".portal-page-heading");
    expect(designSystem).toContain("prefers-reduced-motion: reduce");
    expect(navigation).toContain(
      "portal-mobile-navigation-panel grid gap-3 border-t",
    );
    expect(pageHeading).toContain("portal-page-title");
    expect(pageHeading).toContain("portal-page-actions");
    expect(navigation).toContain('aria-label="Navigasi pengelola"');
    expect(navigation).toContain("portal-mobile-navigation");
  });
});
