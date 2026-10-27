import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { Badge } from "@/components/ui/badge";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { formatDate } from "@/lib/utils";
import { getUpdateFrequencyLabel } from "@/lib/dataset-options";
import {
  submitForReviewAction,
  publishAfterValidationAction,
  startDatasetVersionAction,
} from "./actions";
import { SourceUploadForm } from "@/components/source-upload-form";
import { ConversionJobStatus } from "@/components/admin/conversion-job-status";
import { DatasetArchiveAction } from "@/components/admin/dataset-archive-action";
import { DatasetVersionAbandonAction } from "@/components/admin/dataset-version-abandon-action";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PortalDataTable } from "@/components/admin/portal-data-table";
import { assertBackendQuery } from "@/lib/backend/query-guard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Detail dataset",
  robots: { index: false, follow: false },
};
const datasetActionErrorMessages = {
  forbidden: "Akun Anda belum memiliki akses untuk melakukan tindakan ini.",
  not_found:
    "Dataset tidak ditemukan atau sudah tidak dapat diakses. Kembali ke daftar dan pilih data terbaru.",
  review:
    "Dataset belum dapat diajukan untuk pemeriksaan. Periksa informasi dan berkas sumber.",
  publish:
    "Dataset belum dapat diterbitkan. Periksa hasil validasi dan persyaratan publikasi.",
  validation_failed:
    "Dataset belum memenuhi persyaratan pemeriksaan atau publikasi. Periksa informasi dan hasil validasi berkas.",
  conflict:
    "Status dataset berubah atau tidak lagi sesuai. Muat ulang halaman sebelum mencoba kembali.",
  service_unavailable:
    "Layanan belum berhasil menyelesaikan tindakan ini. Status dataset belum dapat dikonfirmasi; muat ulang halaman sebelum mencoba kembali.",
  version_in_progress:
    "Sudah ada draf versi baru. Selesaikan atau periksa versi tersebut sebelum membuat versi berikutnya.",
  version_requires_published_dataset:
    "Versi baru hanya dapat dibuat dari dataset yang sudah diterbitkan.",
  version_summary_invalid:
    "Ringkasan perubahan wajib diisi antara 5 dan 500 karakter.",
  version_not_ready:
    "Versi draf belum siap diajukan. Periksa apakah berkas sumber sudah selesai diproses.",
  version_not_abandonable:
    "Versi ini tidak dapat dibatalkan pada statusnya saat ini.",
  version_not_in_progress:
    "Tidak ada versi baru yang sedang disiapkan untuk dibatalkan.",
};
export default async function DatasetAdminDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { data, error } = await supabase
    .from("datasets")
    .select(
      "*,organizations(name),dataset_resources(id,original_filename,format,size_bytes,is_source,is_public,conversion_status,dataset_version,created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  assertBackendQuery(error, "portal_dataset_detail");
  if (!data) notFound();
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("id,role")
    .eq("user_id", user.id)
    .eq("organization_id", data.organization_id)
    .eq("is_active", true);
  assertBackendQuery(membershipsError, "portal_dataset_memberships");
  const { data: global, error: globalError } = await supabase
    .from("organization_memberships")
    .select("id,role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .is("organization_id", null)
    .in("role", ["super_admin", "data_admin", "auditor"])
    .limit(3);
  assertBackendQuery(globalError, "portal_dataset_global_access");
  if (!memberships?.length && !global?.length) notFound();
  const canSubmit =
    memberships?.some((item) => ["admin_opd", "editor"].includes(item.role)) ||
    global?.some((item) => ["super_admin", "data_admin"].includes(item.role));
  const canPublish =
    memberships?.some((item) => item.role === "admin_opd") ||
    global?.some((item) => ["super_admin", "data_admin"].includes(item.role));
  const { data: versionHistory, error: versionHistoryError } = await supabase
    .from("dataset_versions")
    .select(
      "id,version,version_status,created_at,change_summary,source_resource_id",
    )
    .eq("dataset_id", data.id)
    .order("version", { ascending: false });
  assertBackendQuery(versionHistoryError, "portal_dataset_version_history");
  const workVersion = data.draft_version ?? data.current_version;
  const activeWorkSnapshot = (versionHistory || []).find(
    (version) => version.version === workVersion,
  );
  const isNewVersionInProgress =
    data.status === "published" && data.draft_version !== null;
  const workSourceReady = (data.dataset_resources || []).some(
    (resource) =>
      resource.dataset_version === workVersion &&
      resource.is_source &&
      resource.conversion_status === "succeeded" &&
      (!activeWorkSnapshot?.source_resource_id ||
        resource.id === activeWorkSnapshot.source_resource_id),
  );
  const mayUploadSource =
    canSubmit &&
    (data.status === "draft" ||
      (isNewVersionInProgress &&
        activeWorkSnapshot?.version_status === "draft"));
  const maySubmitForReview =
    canSubmit &&
    workSourceReady &&
    ((data.status === "draft" &&
      activeWorkSnapshot?.version_status !== "review") ||
      (isNewVersionInProgress &&
        activeWorkSnapshot?.version_status === "draft"));
  const mayPublishVersion =
    canPublish &&
    (data.status === "review" ||
      (isNewVersionInProgress &&
        activeWorkSnapshot?.version_status === "review"));
  const versionRows = (versionHistory || []).map((version) => ({
    ...version,
    source_filename:
      (data.dataset_resources || []).find(
        (resource) => resource.id === version.source_resource_id,
      )?.original_filename || "Belum ada sumber",
  }));
  const versionStatusLabels = {
    draft: "Draf",
    review: "Dalam pemeriksaan",
    published: "Diterbitkan",
    superseded: "Versi terdahulu",
    abandoned: "Dibatalkan",
  };
  const versionStatusVariants = {
    draft: "neutral",
    review: "warning",
    published: "success",
    superseded: "neutral",
    abandoned: "danger",
  };
  // Only fetch the latest job for the current work version; completed conversion
  // history can grow over time and should not inflate the detail page response.
  const { data: latestCurrentJob, error: conversionJobError } = await supabase
    .from("conversion_jobs")
    .select(
      "id,status,safe_error_message,attempts,max_attempts,created_at,started_at,finished_at,updated_at,lease_expires_at",
    )
    .eq("dataset_id", data.id)
    .eq("dataset_version", workVersion)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (conversionJobError) {
    console.error("portal_dataset_conversion_job_lookup_failed", {
      code: conversionJobError.code || "unknown",
    });
  }
  const failedConversionJob =
    !conversionJobError && latestCurrentJob?.status === "failed"
      ? latestCurrentJob
      : null;
  const retryingConversionJob =
    !conversionJobError &&
    latestCurrentJob?.status === "queued" &&
    Boolean(latestCurrentJob.safe_error_message);
  const activeConversionJob =
    !conversionJobError &&
    latestCurrentJob &&
    ["queued", "processing"].includes(latestCurrentJob.status)
      ? {
          id: latestCurrentJob.id,
          status: latestCurrentJob.status,
          attempts: latestCurrentJob.attempts,
          maxAttempts: latestCurrentJob.max_attempts,
          safeErrorMessage: latestCurrentJob.safe_error_message,
          createdAt: latestCurrentJob.created_at,
          startedAt: latestCurrentJob.started_at,
          finishedAt: latestCurrentJob.finished_at,
          updatedAt: latestCurrentJob.updated_at,
          leaseExpiresAt: latestCurrentJob.lease_expires_at,
        }
      : null;
  return (
    <>
      <Link href="/portal/dataset" className="text-sm font-medium text-primary">
        ← Kembali ke daftar
      </Link>
      <PageHeading
        eyebrow="Detail dataset"
        title={data.title}
        description={data.description}
      >
        <Badge
          variant={
            data.status === "published"
              ? "success"
              : data.status === "review"
                ? "warning"
                : "neutral"
          }
        >
          {data.status}
        </Badge>
      </PageHeading>
      <PortalContextGuide />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-card border bg-white p-5 sm:p-7">
          <h2 className="text-lg font-semibold">Informasi dataset</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["Kode", data.code],
              ["Organisasi", data.organizations?.name],
              ["Sumber", data.source_name],
              ["Cakupan", data.geographic_scope],
              ["Lisensi", data.license_text],
              ["Frekuensi", getUpdateFrequencyLabel(data.update_frequency)],
              [
                data.status === "published" ? "Versi publik" : "Versi kerja",
                data.current_version,
              ],
              ...(data.draft_version
                ? [["Draf versi", data.draft_version]]
                : []),
              ["Diperbarui", formatDate(data.updated_at)],
            ].map(([k, v]) => (
              <div key={k} className="border-b pb-3">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="mt-1 break-words text-sm font-medium">
                  {v || "Belum tersedia"}
                </dd>
              </div>
            ))}
          </dl>
          {isNewVersionInProgress ? (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
              <p className="font-semibold">
                Versi {data.draft_version} sedang disiapkan
              </p>
              <p className="mt-1">
                Versi publik saat ini tetap versi {data.current_version}. Versi
                baru baru akan menggantikannya setelah konversi, pemeriksaan,
                dan publikasi berhasil.
              </p>
            </div>
          ) : null}
          <h2 className="mt-8 text-lg font-semibold">Riwayat versi dataset</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Setiap versi menyimpan ringkasan perubahan, sumber, waktu pembuatan,
            dan status rilis. Versi terdahulu tetap tersimpan sebagai riwayat.
          </p>
          <div className="mt-4">
            <PortalDataTable
              caption="Riwayat versi dataset"
              rows={versionRows}
              searchPlaceholder="Cari versi, ringkasan perubahan, sumber, atau status…"
              dateFilterLabel="Tanggal dibuat"
              alwaysShowFilters={["version_status"]}
              filterLabelOverrides={{ version_status: "Status versi" }}
              columns={[
                {
                  key: "version",
                  label: "Versi",
                  render: (version) => (
                    <span className="font-semibold">v{version.version}</span>
                  ),
                },
                {
                  key: "version_status",
                  label: "Status versi",
                  render: (version) => (
                    <Badge
                      variant={
                        versionStatusVariants[version.version_status] ||
                        "neutral"
                      }
                    >
                      {versionStatusLabels[version.version_status] ||
                        version.version_status}
                    </Badge>
                  ),
                },
                {
                  key: "change_summary",
                  label: "Ringkasan perubahan",
                  render: (version) => version.change_summary || "—",
                },
                {
                  key: "source_filename",
                  label: "Sumber",
                  render: (version) => version.source_filename,
                },
                {
                  key: "created_at",
                  label: "Dibuat",
                  render: (version) => formatDate(version.created_at),
                },
              ]}
              emptyTitle="Riwayat versi belum tersedia"
              emptyDescription="Versi akan tercatat saat sumber dataset pertama kali didaftarkan atau saat Anda membuat versi baru."
            />
          </div>
          <h2 className="mt-8 text-lg font-semibold">
            Berkas dan hasil pengolahan
          </h2>
          {conversionJobError ? (
            <div
              role="status"
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
            >
              <p className="font-semibold">
                Status pemrosesan belum dapat diverifikasi
              </p>
              <p className="mt-1">
                Informasi berkas tetap ditampilkan, tetapi riwayat pemrosesan
                sedang tidak tersedia. Muat ulang halaman untuk memeriksa status
                terbaru.
              </p>
            </div>
          ) : null}
          {retryingConversionJob && !activeConversionJob ? (
            <div
              role="status"
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
            >
              <p className="font-semibold">
                Pemrosesan mengalami kendala sementara
              </p>
              <p className="mt-1">{latestCurrentJob.safe_error_message}</p>
              <p className="mt-2">
                Kami akan mencoba kembali setelah kendala sementara teratasi.
                Periksa status ini sebelum mengunggah berkas yang sama lagi.
              </p>
            </div>
          ) : null}
          {activeConversionJob ? (
            <ConversionJobStatus
              key={`${activeConversionJob.id}:${workVersion}`}
              datasetId={data.id}
              version={workVersion}
              initialJob={activeConversionJob}
            />
          ) : null}
          {failedConversionJob ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900"
            >
              <p className="font-semibold">Berkas belum berhasil diproses</p>
              <p className="mt-1">
                {failedConversionJob.safe_error_message ||
                  "Berkas belum dapat diproses. Periksa format dan isi sumber, lalu unggah ulang."}
              </p>
              {mayUploadSource ? (
                <p className="mt-2">
                  Periksa berkas sumber, lalu unggah kembali pada formulir di
                  bawah.
                </p>
              ) : (
                <p className="mt-2">
                  Hubungi administrator portal untuk meninjau berkas sumber.
                </p>
              )}
            </div>
          ) : null}
          <PortalDataTable
            caption="Berkas dan status pengolahan dataset"
            rows={data.dataset_resources || []}
            alwaysShowFilters={["format", "conversion_status"]}
            filterLabelOverrides={{
              format: "Format",
              conversion_status: "Status konversi",
            }}
            columns={[
              {
                key: "original_filename",
                label: "Berkas",
                render: (resource) => (
                  <div className="portal-dataset-title-cell">
                    <span className="portal-table-primary-link">
                      {resource.original_filename}
                    </span>
                    <span className="portal-table-subtext">
                      Versi {resource.dataset_version}
                    </span>
                  </div>
                ),
              },
              {
                key: "format",
                label: "Format",
                render: (resource) => resource.format || "Belum tersedia",
              },
              {
                key: "source",
                label: "Jenis",
                render: (resource) =>
                  resource.is_source ? "Sumber asli" : "Hasil konversi",
              },
              {
                key: "conversion_status",
                label: "Status",
                render: (resource) => (
                  <Badge
                    variant={
                      resource.conversion_status === "succeeded"
                        ? "success"
                        : resource.conversion_status === "failed"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {resource.conversion_status === "succeeded"
                      ? "Selesai"
                      : resource.conversion_status === "failed"
                        ? "Gagal"
                        : "Diproses"}
                  </Badge>
                ),
              },
            ]}
            emptyTitle="Belum ada berkas terkait"
            emptyDescription="Unggah berkas sumber untuk memulai pemeriksaan dan pemrosesan dataset."
          />
          {mayUploadSource ? (
            <>
              {data.status === "draft" ? (
                <Link
                  href={`/portal/dataset/${data.id}/edit`}
                  className="mt-5 inline-flex rounded-control border px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Ubah informasi
                </Link>
              ) : null}
              <SourceUploadForm
                datasetId={data.id}
                versionNumber={workVersion}
                isNewVersion={isNewVersionInProgress}
              />
            </>
          ) : null}
        </section>
        <aside className="h-fit rounded-card border bg-white p-5">
          {query?.action_error ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {datasetActionErrorMessages[query.action_error] ||
                datasetActionErrorMessages.service_unavailable}
            </p>
          ) : null}
          {query?.action_success ? (
            <p
              role="status"
              className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            >
              {query.action_success === "review"
                ? isNewVersionInProgress
                  ? `Versi ${workVersion} dikirim untuk pemeriksaan. Versi publik sebelumnya tetap aktif.`
                  : "Dataset dikirim untuk pemeriksaan."
                : query.action_success === "updated"
                  ? "Informasi dataset berhasil diperbarui."
                  : query.action_success === "version_created"
                    ? `Draf versi ${data.draft_version ?? query.version ?? "baru"} dibuat. Unggah sumber versi tersebut untuk melanjutkan.`
                    : query.action_success === "version_abandoned"
                      ? "Draf versi dibatalkan. Versi publik sebelumnya tetap aktif."
                      : "Dataset berhasil dipublikasikan."}
            </p>
          ) : null}
          <h2 className="font-semibold">Alur publikasi</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-muted">
            {isNewVersionInProgress ? (
              <>
                <li>1. Unggah sumber untuk versi {workVersion}.</li>
                <li>
                  2. Tunggu sampai berkas selesai divalidasi dan dikonversi.
                </li>
                <li>
                  3. Ajukan versi baru agar metadata dan hasil konversi
                  diperiksa.
                </li>
                <li>4. Terbitkan versi baru setelah pemeriksaan selesai.</li>
              </>
            ) : (
              <>
                <li>1. Lengkapi informasi dan periode data.</li>
                <li>2. Unggah berkas sumber.</li>
                <li>
                  3. Tunggu sampai berkas dan informasi dataset selesai
                  diperiksa.
                </li>
                <li>4. Terbitkan dataset setelah pemeriksaan disetujui.</li>
              </>
            )}
          </ol>
          {canSubmit && data.status === "published" && !data.draft_version ? (
            <form
              action={startDatasetVersionAction}
              className="mt-5 border-t pt-4"
            >
              <input type="hidden" name="dataset_id" value={data.id} />
              <label
                htmlFor="version-change-summary"
                className="block text-sm font-medium"
              >
                Ringkasan perubahan versi berikutnya
              </label>
              <textarea
                id="version-change-summary"
                name="change_summary"
                required
                minLength={5}
                maxLength={500}
                rows={3}
                className="mt-2 w-full rounded-control border border-line bg-white px-3 py-2.5 text-sm leading-6"
                placeholder="Contoh: Pembaruan data semester II tahun 2026"
                aria-describedby="version-change-summary-help"
              />
              <p
                id="version-change-summary-help"
                className="mt-1 text-xs leading-5 text-muted"
              >
                Metadata dataset tetap sama. Versi publik sekarang tidak berubah
                sampai versi baru disetujui dan diterbitkan.
              </p>
              <FormSubmitButton
                className="mt-3 w-full rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
                pendingText="Membuat versi…"
              >
                Buat versi baru
              </FormSubmitButton>
            </form>
          ) : null}
          {maySubmitForReview ? (
            <form action={submitForReviewAction} className="mt-5 border-t pt-4">
              <input type="hidden" name="dataset_id" value={data.id} />
              <FormSubmitButton
                className="w-full rounded-control border px-4 py-3 text-sm font-semibold hover:bg-slate-50"
                pendingText="Mengirim untuk pemeriksaan…"
              >
                {isNewVersionInProgress
                  ? "Ajukan versi baru untuk pemeriksaan"
                  : "Kirim untuk pemeriksaan"}
              </FormSubmitButton>
            </form>
          ) : null}
          {mayPublishVersion ? (
            <form action={publishAfterValidationAction} className="mt-3">
              <input type="hidden" name="dataset_id" value={data.id} />
              <FormSubmitButton
                className="w-full rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
                pendingText="Memublikasikan…"
              >
                {isNewVersionInProgress
                  ? `Terbitkan versi ${workVersion}`
                  : "Publikasikan setelah validasi"}
              </FormSubmitButton>
            </form>
          ) : null}
          {isNewVersionInProgress &&
          ["draft", "review"].includes(activeWorkSnapshot?.version_status) ? (
            <DatasetVersionAbandonAction
              datasetId={data.id}
              version={workVersion}
            />
          ) : null}
          {global?.some((item) =>
            ["super_admin", "data_admin"].includes(item.role),
          ) ? (
            <DatasetArchiveAction id={data.id} status={data.status} />
          ) : null}
        </aside>
      </div>
    </>
  );
}
