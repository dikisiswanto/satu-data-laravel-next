import { redirect } from "next/navigation";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { portalData } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { Badge } from "@/components/ui/badge";
import { PortalDataTable } from "@/components/admin/portal-data-table";
import { AuditLogDetailDialog } from "@/components/admin/audit-log-detail-dialog";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Riwayat perubahan",
  robots: { index: false, follow: false },
};

const actionLabels = {
  "account.login": "Masuk ke portal",
  "account.logout": "Keluar dari portal",
  "account.password_reset": "Mengatur ulang kata sandi",
  "dataset.create_draft": "Membuat draf dataset",
  "dataset.create": "Membuat dataset",
  "dataset.update": "Memperbarui metadata dataset",
  "dataset.update_metadata": "Memperbarui metadata dataset",
  "dataset.source_uploaded": "Mengunggah berkas sumber",
  "dataset.source_upload": "Mengunggah berkas sumber",
  "dataset.sdi_metadata_update": "Memperbarui metadata SDI dataset",
  "dataset.version_start": "Memulai versi dataset",
  "dataset.submit_review": "Mengajukan dataset untuk pemeriksaan",
  "dataset.publish": "Menerbitkan dataset",
  "dataset.archive": "Mengarsipkan dataset",
  "dataset.return_for_changes": "Mengembalikan dataset untuk perbaikan",
  "dataset.submit_for_review": "Mengajukan dataset untuk pemeriksaan",
  "dataset.publish": "Menerbitkan dataset",
  "dataset.archive": "Mengarsipkan dataset",
  "dataset.abandon_version": "Membatalkan versi draf dataset",
  "dataset.start_version": "Memulai versi dataset",
  "indicator.create": "Membuat indikator statistik",
  "indicator.update": "Memperbarui indikator statistik",
  "indicator.observation_create": "Menambahkan nilai indikator",
  "indicator.observation_publish": "Menerbitkan nilai indikator",
  "indicator.publish": "Menerbitkan indikator statistik",
  "indicator.submit_for_review": "Mengajukan indikator untuk pemeriksaan",
  "indicator.return_for_changes": "Mengembalikan indikator untuk perbaikan",
  "indicator.submit_for_review": "Mengajukan indikator untuk pemeriksaan",
  "indicator.publish": "Menerbitkan indikator statistik",
  "indicator.archive": "Mengarsipkan indikator statistik",
  "indicator.archive": "Mengarsipkan indikator statistik",
  "organization.create": "Membuat organisasi",
  "organization.update": "Memperbarui organisasi",
  "sdi.registry_create": "Menambahkan referensi SDI",
  "sdi.registry_verify": "Memverifikasi referensi SDI",
  "sdi.registry_deprecate": "Menonaktifkan referensi SDI",
  "sdi.preflight": "Memeriksa kesiapan integrasi SDI",
  "user.invite": "Mengundang pengguna",
  "membership.create": "Menambahkan akses pengguna",
  "membership.update": "Memperbarui akses pengguna",
  "profile.update": "Memperbarui profil",
  "profile.onboarding_completed": "Menyelesaikan panduan awal",
  "account.password_changed": "Mengubah kata sandi",
  "account.onboarding_completed": "Menyelesaikan panduan awal",
};
const entityLabels = {
  dataset: "Dataset",
  dataset_resource: "Berkas dataset",
  indicator: "Indikator statistik",
  organization: "Organisasi",
  membership: "Kewenangan pengguna",
  profile: "Profil pengguna",
  account: "Akun",
  user: "Pengguna",
  indicator_observation: "Nilai indikator",
  sdi_registry: "Referensi SDI",
  sdi_harvest_run: "Pemeriksaan integrasi SDI",
};
const outcomeLabels = {
  success: "Berhasil",
  denied: "Ditolak",
  failure: "Gagal",
};

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(date);
}

function actionLabel(value) {
  return (
    actionLabels[value] ||
    String(value || "Aktivitas lainnya").replace(/[._]/g, " ")
  );
}

export default async function AuditHistoryPage() {
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const rows = await portalData("audit-logs?limit=500");
  const error = null;

  return (
    <>
      <PageHeading
        eyebrow="Akuntabilitas"
        title="Riwayat perubahan"
        description="Lihat siapa yang mengubah data, perubahan apa yang dilakukan, dan kapan waktunya. Daftar yang tampil menyesuaikan akses akun Anda."
      />
      <PortalContextGuide />

      <section id="portal-audit-history" className="portal-workspace-panel">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Riwayat aktivitas</h2>
            <p className="mt-1 text-sm text-muted">
              Cari berdasarkan pengguna, tindakan, ID data, organisasi, atau
              hasil. Gunakan filter dan rentang tanggal untuk menemukan
              aktivitas tertentu.
            </p>
          </div>
          <span className="portal-result-count">
            {error
              ? "Data belum tersedia"
              : `${(rows || []).length.toLocaleString("id-ID")} aktivitas dimuat`}
          </span>
        </div>
        {error ? (
          <div className="portal-state-panel portal-state-error" role="alert">
            <h3>Riwayat perubahan belum dapat ditampilkan</h3>
            <p>
              Coba muat ulang halaman beberapa saat lagi. Jika masalah tetap
              muncul, hubungi administrator portal.
            </p>
          </div>
        ) : (
          <>
            <div
              className="portal-audit-insight-grid"
              aria-label="Ringkasan audit yang dimuat"
            >
              <div>
                <span>Berhasil</span>
                <strong>
                  {rows
                    .filter((row) => row.outcome === "success")
                    .length.toLocaleString("id-ID")}
                </strong>
              </div>
              <div>
                <span>Ditolak</span>
                <strong>
                  {rows
                    .filter((row) => row.outcome === "denied")
                    .length.toLocaleString("id-ID")}
                </strong>
              </div>
              <div>
                <span>Gagal</span>
                <strong>
                  {rows
                    .filter((row) => row.outcome === "failure")
                    .length.toLocaleString("id-ID")}
                </strong>
              </div>
              <div>
                <span>Pengguna yang terlibat</span>
                <strong>
                  {new Set(
                    rows.map((row) => row.actor_user_id).filter(Boolean),
                  ).size.toLocaleString("id-ID")}
                </strong>
              </div>
            </div>
            <PortalDataTable
              caption="Riwayat tindakan audit"
              rows={rows}
              searchPlaceholder="Cari pelaku, tindakan, ID objek, organisasi, atau rincian…"
              dateFilterLabel="Waktu peristiwa"
              alwaysShowFilters={[
                "outcome",
                "entity_type",
                "action",
                "organization_name",
              ]}
              filterLabelOverrides={{
                outcome: "Hasil",
                entity_type: "Jenis objek",
                action: "Peristiwa",
                organization_name: "Organisasi",
              }}
              columns={[
                {
                  key: "action",
                  label: "Tindakan",
                  render: (item) => (
                    <div className="portal-dataset-title-cell">
                      <span className="portal-table-primary-link">
                        {actionLabel(item.action)}
                      </span>
                      <span className="portal-table-subtext">
                        {item.action}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "actor",
                  label: "Pelaku",
                  render: (item) => (
                    <div className="portal-dataset-title-cell">
                      <span className="font-semibold text-[#183f59]">
                        {item.actor_display_name ||
                          (item.actor_user_id
                            ? "Nama belum tersedia"
                            : "Aktivitas otomatis")}
                      </span>
                      {item.actor_user_id ? (
                        <span
                          className="portal-table-subtext font-mono"
                          title={item.actor_user_id}
                        >
                          ID {item.actor_user_id.slice(0, 8)}…
                        </span>
                      ) : (
                        <span className="portal-table-subtext">
                          Tanpa akun pengguna
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "object",
                  label: "Objek",
                  render: (item) => (
                    <div className="portal-dataset-title-cell">
                      <span>
                        {entityLabels[item.entity_type] || item.entity_type}
                      </span>
                      {item.entity_id ? (
                        <span
                          className="portal-table-subtext break-all font-mono"
                          title={item.entity_id}
                        >
                          {item.entity_id}
                        </span>
                      ) : (
                        <span className="portal-table-subtext">
                          ID objek tidak dicatat
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "organization",
                  label: "Lingkup",
                  render: (item) => item.organization_name,
                },
                {
                  key: "created_at",
                  label: "Waktu (WITA)",
                  render: (item) => (
                    <time dateTime={item.created_at}>
                      {formatDateTime(item.created_at)}
                    </time>
                  ),
                },
                {
                  key: "outcome",
                  label: "Hasil",
                  render: (item) => (
                    <Badge
                      variant={
                        item.outcome === "success"
                          ? "success"
                          : item.outcome === "denied"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {outcomeLabels[item.outcome] || item.outcome}
                    </Badge>
                  ),
                },
                {
                  key: "summary",
                  label: "Rincian / permintaan",
                  render: (item) => (
                    <AuditLogDetailDialog
                      item={item}
                      actionLabel={actionLabel(item.action)}
                      entityLabel={
                        entityLabels[item.entity_type] || item.entity_type
                      }
                    />
                  ),
                },
              ]}
              emptyTitle="Belum ada aktivitas yang tercatat"
              emptyDescription="Aktivitas yang sesuai dengan akses akun Anda akan muncul di sini setelah ada perubahan yang tercatat."
            />
          </>
        )}
      </section>
      <p className="mt-4 text-xs leading-5 text-muted">
        Halaman ini menampilkan hingga 500 aktivitas terbaru yang dapat diakses.
        Detail yang tidak dicatat pada saat tindakan berlangsung tidak dapat
        direkonstruksi secara retroaktif.
      </p>
    </>
  );
}
