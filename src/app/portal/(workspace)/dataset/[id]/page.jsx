import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalData } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { Badge } from "@/components/ui/badge";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { formatDate } from "@/lib/utils";
import { getUpdateFrequencyLabel } from "@/lib/dataset-options";
import {
  submitForReviewAction,
  publishAfterValidationAction,
  startDatasetVersionAction,
  returnDatasetForChangesAction,
} from "./actions";
import { SourceUploadForm } from "@/components/source-upload-form";
import { ConversionJobStatus } from "@/components/admin/conversion-job-status";
import { DatasetArchiveAction } from "@/components/admin/dataset-archive-action";
import { DatasetVersionAbandonAction } from "@/components/admin/dataset-version-abandon-action";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PortalDataTable } from "@/components/admin/portal-data-table";
import {
  DatasetLifecycleGuide,
  DATASET_REVIEW_METADATA,
} from "@/components/admin/dataset-lifecycle-guide";
import { FilePenLine, Upload, Layers3 } from "lucide-react";
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
  authentication_unavailable:
    "Layanan autentikasi sedang terganggu. Sesi Anda belum dianggap berakhir; coba tindakan ini kembali sebentar lagi.",
  authorization_unavailable:
    "Hak akses belum dapat diperiksa. Tidak ada perubahan yang dikirim; coba kembali sebentar lagi.",
  version_in_progress:
    "Sudah ada draf versi baru. Selesaikan atau periksa versi tersebut sebelum membuat versi berikutnya.",
  version_requires_published_dataset:
    "Versi baru hanya dapat dibuat dari dataset yang sudah diterbitkan.",
  version_summary_invalid:
    "Ringkasan perubahan wajib diisi antara 5 dan 500 karakter.",
  version_not_ready:
    "Versi draf belum siap diajukan. Pastikan berkas sumber selesai diproses dan hasil validasinya lulus.",
  validation_required:
    "Validasi otomatis belum lulus. Periksa status pemrosesan berkas sumber sebelum mengajukan pemeriksaan.",
  review_reason_invalid:
    "Catatan perbaikan wajib diisi antara 5 dan 1.000 karakter.",
  review_returned:
    "Dataset dikembalikan untuk perbaikan. Periksa catatan pemeriksaan, ubah draf, lalu ajukan kembali.",
  version_not_abandonable:
    "Versi ini tidak dapat dibatalkan pada statusnya saat ini.",
  version_not_in_progress:
    "Tidak ada versi baru yang sedang disiapkan untuk dibatalkan.",
};
export default async function DatasetAdminDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  let data;
  try {
    data = await portalData(`datasets/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error.status === 404 || error.status === 403) notFound();
    throw error;
  }
  if (!data) notFound();
  const { memberships: allMemberships = [] } = await getPortalShell();
  const memberships = allMemberships.filter(
    (item) => item.organization_id === data.organization_id,
  );
  const global = allMemberships.filter(
    (item) =>
      !item.organization_id &&
      ["super_admin", "data_admin", "auditor"].includes(item.role),
  );
  if (!memberships.length && !global.length) notFound();
  const canSubmit =
    memberships?.some((item) => ["admin_opd", "editor"].includes(item.role)) ||
    global?.some((item) => ["super_admin", "data_admin"].includes(item.role));
  const canPublish =
    memberships?.some((item) => item.role === "admin_opd") ||
    global?.some((item) => ["super_admin", "data_admin"].includes(item.role));
  const canReview =
    memberships?.some((item) =>
      ["admin_opd", "reviewer"].includes(item.role),
    ) ||
    global?.some((item) => ["super_admin", "data_admin"].includes(item.role));
  const versionHistory = data.versions || [];
  const workVersion = data.draft_version ?? data.current_version;
  const activeWorkSnapshot = (versionHistory || []).find(
    (version) => version.version === workVersion,
  );
  const isNewVersionInProgress =
    data.draft_version !== null &&
    data.draft_version !== undefined &&
    Number(data.current_version || 0) > 0;
  const resources = data.resources || data.dataset_resources || [];
  const sourceResources = resources.filter((resource) =>
    Boolean(resource.is_source),
  );
  const distributionResources = resources.filter(
    (resource) => !resource.is_source,
  );
  const mayEditMetadata =
    canSubmit &&
    (data.status === "draft" ||
      (isNewVersionInProgress &&
        activeWorkSnapshot?.version_status === "draft"));
  const workSourceReady = resources.some(
    (resource) =>
      resource.dataset_version === workVersion &&
      resource.is_source &&
      resource.conversion_status === "succeeded" &&
      (!activeWorkSnapshot?.source_resource_id ||
        resource.id === activeWorkSnapshot.source_resource_id),
  );
  const workSourceExists = resources.some(
    (resource) =>
      resource.dataset_version === workVersion &&
      resource.is_source &&
      (!activeWorkSnapshot?.source_resource_id ||
        resource.id === activeWorkSnapshot.source_resource_id),
  );
  const workSourceProcessing = resources.some(
    (resource) =>
      resource.dataset_version === workVersion &&
      resource.is_source &&
      (!activeWorkSnapshot?.source_resource_id ||
        resource.id === activeWorkSnapshot.source_resource_id) &&
      ["queued", "processing"].includes(resource.conversion_status),
  );
  const workSourceFailed = resources.some(
    (resource) =>
      resource.dataset_version === workVersion &&
      resource.is_source &&
      (!activeWorkSnapshot?.source_resource_id ||
        resource.id === activeWorkSnapshot.source_resource_id) &&
      resource.conversion_status === "failed",
  );
  const reviewMetadata = DATASET_REVIEW_METADATA.map((field) => ({
    ...field,
    complete:
      typeof data[field.key] === "string" && data[field.key].trim().length > 0,
  }));
  const missingReviewMetadata = reviewMetadata.filter(
    (field) => !field.complete,
  );
  const validationRun = data.validation_run || null;
  const validationPassed = validationRun?.status === "passed";
  const sourceChecklistLabel = workSourceReady
    ? "Berkas sumber selesai diproses"
    : workSourceProcessing
      ? "Berkas sumber sedang diproses"
      : workSourceFailed
        ? "Pemrosesan berkas gagal; unggah ulang sumber"
        : "Berkas sumber belum diunggah";
  const validationChecklistLabel = validationPassed
    ? "Validasi otomatis lulus"
    : validationRun?.status === "failed"
      ? "Validasi gagal; periksa berkas sumber"
      : "Menunggu validasi otomatis";
  const isInReview =
    data.status === "review" || activeWorkSnapshot?.version_status === "review";
  const isFullyPublished = data.status === "published" && !data.draft_version;
  const lifecycleCompletedThrough = isFullyPublished
    ? 5
    : isInReview
      ? 4
      : workSourceReady
        ? 3
        : workSourceExists && !workSourceFailed
          ? 2
          : 1;
  const lifecycleActiveStep = isFullyPublished
    ? 5
    : isInReview
      ? 5
      : !workSourceExists || workSourceFailed
        ? 2
        : !workSourceReady
          ? 3
          : 4;
  const mayUploadSource =
    canSubmit &&
    (!workSourceReady || workSourceFailed) &&
    !workSourceProcessing &&
    (data.status === "draft" ||
      (isNewVersionInProgress &&
        activeWorkSnapshot?.version_status === "draft"));
  const hasEditableWorkDraft =
    canSubmit &&
    ((data.status === "draft" &&
      activeWorkSnapshot?.version_status !== "review") ||
      (isNewVersionInProgress &&
        activeWorkSnapshot?.version_status === "draft"));
  const reviewRequirementsComplete =
    workSourceReady && validationPassed && missingReviewMetadata.length === 0;
  const maySubmitForReview = hasEditableWorkDraft && reviewRequirementsComplete;
  const mayPublishVersion =
    canPublish &&
    (data.status === "review" ||
      (isNewVersionInProgress &&
        activeWorkSnapshot?.version_status === "review"));
  const versionRows = (versionHistory || []).map((version) => ({
    ...version,
    source_filename:
      resources.find((resource) => resource.id === version.source_resource_id)
        ?.original_filename || "Belum ada sumber",
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
  const latestCurrentJob = (data.conversion_jobs || []).find(
    (job) => job.dataset_version === workVersion,
  );
  const conversionJobError = null;
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
      <Link
        href="/portal/dataset"
        className="text-sm font-medium text-primary"
        prefetch={false}
      >
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
          {{
            draft: "Draf",
            review: "Menunggu pemeriksaan",
            published: "Terbit",
            archived: "Diarsipkan",
          }[data.status] || data.status}
        </Badge>
      </PageHeading>
      <PortalContextGuide />
      {data.status !== "archived" ? (
        <div className="mb-6">
          <DatasetLifecycleGuide
            activeStep={lifecycleActiveStep}
            completedThrough={lifecycleCompletedThrough}
            links={{
              source: mayUploadSource ? `#dataset-source-upload` : undefined,
              metadata: mayEditMetadata
                ? `/portal/dataset/${data.id}/edit`
                : undefined,
            }}
            heading={
              isNewVersionInProgress
                ? `Alur versi ${workVersion}`
                : "Langkah berikutnya"
            }
            description={
              isFullyPublished
                ? "Dataset ini sudah diterbitkan. Langkah berikutnya hanya diperlukan ketika Anda menyiapkan versi baru."
                : "Selesaikan langkah yang sedang aktif. Anda tidak perlu menebak kode atau metadata standar yang belum memiliki rujukan resmi."
            }
          />
        </div>
      ) : null}

      <section
        aria-label="Tindakan utama dataset"
        className="mb-5 grid gap-3 md:grid-cols-3"
      >
        {mayEditMetadata ? (
          <Link
            href={`/portal/dataset/${data.id}/edit`}
            prefetch={false}
            className="group flex min-h-24 items-start gap-3 rounded-card border border-line bg-white p-4 transition-colors hover:border-primary/40 hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
              <FilePenLine size={19} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">Edit metadata</span>
              <span className="mt-1 block text-sm leading-5 text-muted">
                Judul, kategori, kata kunci, sumber, lisensi, dan standar.
              </span>
            </span>
          </Link>
        ) : null}
        {mayUploadSource ? (
          <a
            href="#dataset-source-upload"
            className="group flex min-h-24 items-start gap-3 rounded-card border border-line bg-white p-4 transition-colors hover:border-primary/40 hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Upload size={19} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">Unggah berkas sumber</span>
              <span className="mt-1 block text-sm leading-5 text-muted">
                Pilih file asli untuk divalidasi dan diproses.
              </span>
            </span>
          </a>
        ) : null}
        {canSubmit && data.status === "published" && !isNewVersionInProgress ? (
          <a
            href="#dataset-review"
            className="group flex min-h-24 items-start gap-3 rounded-card border border-line bg-white p-4 transition-colors hover:border-primary/40 hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
              <Layers3 size={19} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">Buat versi baru</span>
              <span className="mt-1 block text-sm leading-5 text-muted">
                Perbarui data tanpa mengubah metadata dan berkas yang sedang
                terbit.
              </span>
            </span>
          </a>
        ) : null}
        <a
          href="#dataset-distributions"
          className="group flex min-h-24 items-start gap-3 rounded-card border border-line bg-white p-4 transition-colors hover:border-primary/40 hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-800">
            <Layers3 size={19} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">Distribusi unduhan</span>
            <span className="mt-1 block text-sm leading-5 text-muted">
              Lihat file hasil pemrosesan yang tersedia untuk pengguna.
            </span>
          </span>
        </a>
      </section>

      <nav
        aria-label="Bagian pengelolaan dataset"
        className="mb-5 flex flex-wrap gap-2 rounded-card border border-line bg-white p-3"
      >
        {[
          ["#dataset-metadata", "Metadata"],
          ["#dataset-source-workspace", "Data & berkas"],
          ["#dataset-distributions", "Distribusi"],
          ["#dataset-versions", "Riwayat versi"],
          ["#dataset-review", "Pemeriksaan dan publikasi"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="inline-flex min-h-10 items-center rounded-control border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section
            id="dataset-metadata"
            className="scroll-mt-24 rounded-card border bg-white p-5 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Metadata dataset
                </p>
                <h2 className="mt-1 text-lg font-semibold">Tentang dataset</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                  Informasi untuk membantu pengguna menemukan, memahami,
                  menggunakan, dan mengutip data ini.
                </p>
              </div>
              {mayEditMetadata ? (
                <Link
                  href={`/portal/dataset/${data.id}/edit`}
                  prefetch={false}
                  className="inline-flex min-h-10 items-center rounded-control border border-line px-3 py-2 text-sm font-semibold hover:bg-surface-secondary"
                >
                  Ubah metadata
                </Link>
              ) : null}
            </div>
            <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {[
                ["Kode", data.code],
                ["Organisasi pengampu", data.organizations?.name],
                ["Kategori", data.category],
                [
                  "Kata kunci",
                  Array.isArray(data.keywords)
                    ? data.keywords.join(", ")
                    : data.keywords,
                ],
                ["Sumber / penerbit data", data.source_name],
                ["URL rujukan sumber", data.source_url],
                ["Cakupan wilayah", data.geographic_scope],
                ["Lisensi / ketentuan penggunaan", data.license_text],
                [
                  "Frekuensi pembaruan",
                  getUpdateFrequencyLabel(data.update_frequency),
                ],
                ["Satuan", data.unit],
                [
                  "Periode data",
                  [data.reference_period_start, data.reference_period_end]
                    .filter(Boolean)
                    .map(formatDate)
                    .join(" – "),
                ],
                [
                  data.status === "published" ? "Versi publik" : "Versi kerja",
                  data.current_version,
                ],
                ...(data.draft_version
                  ? [["Draf versi", data.draft_version]]
                  : []),
                ["Terakhir diperbarui", formatDate(data.updated_at)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-0 border-b border-line/70 pb-3 last:border-b-0"
                >
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium">
                    {value || "Belum diisi"}
                  </dd>
                </div>
              ))}
            </dl>
            {isNewVersionInProgress ? (
              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                <p className="font-semibold">
                  Draf versi {data.draft_version} sedang disiapkan
                </p>
                <p className="mt-1">
                  Versi publik saat ini tetap versi {data.current_version}.
                  Metadata dan sumber versi baru tidak mengubah versi publik
                  sampai pemeriksaan dan publikasi berhasil.
                </p>
              </div>
            ) : null}
          </section>

          <section
            id="dataset-source-workspace"
            className="scroll-mt-24 rounded-card border bg-white p-5 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Data & berkas
                </p>
                <h2 className="mt-1 text-lg font-semibold">Sumber data</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                  Unggah berkas asli untuk versi ini. Berkas sumber menjadi
                  input validasi dan konversi; distribusi hasil pengolahan
                  ditata terpisah agar format unduhan tidak tercampur dengan
                  sumber asli.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-line bg-surface-secondary px-3 py-1.5 text-xs font-semibold">
                {sourceResources.length} berkas sumber
              </span>
            </div>
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
                  sedang tidak tersedia. Muat ulang halaman untuk memeriksa
                  status terbaru.
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
                <p className="mt-2">
                  {mayUploadSource
                    ? "Periksa berkas sumber, lalu unggah kembali pada bagian di bawah."
                    : "Hubungi administrator portal untuk meninjau berkas sumber."}
                </p>
              </div>
            ) : null}
            {mayUploadSource ? (
              <div
                id="dataset-source-upload"
                className="mt-5 scroll-mt-24 rounded-xl border border-dashed border-[#a9bdcc] bg-[#f7fafc] p-4 sm:p-5"
                aria-label="Unggah berkas sumber"
              >
                <SourceUploadForm
                  datasetId={data.id}
                  versionNumber={workVersion}
                  isNewVersion={isNewVersionInProgress}
                />
              </div>
            ) : null}
            <div className="mt-5">
              <PortalDataTable
                caption="Berkas sumber dataset"
                rows={sourceResources}
                alwaysShowFilters={["format", "conversion_status"]}
                filterLabelOverrides={{
                  format: "Format",
                  conversion_status: "Status pemrosesan",
                }}
                columns={[
                  {
                    key: "original_filename",
                    label: "Nama berkas",
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
                    render: (resource) => resource.format || "Belum diketahui",
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
                          ? "Siap"
                          : resource.conversion_status === "failed"
                            ? "Gagal"
                            : "Diproses"}
                      </Badge>
                    ),
                  },
                ]}
                emptyTitle="Berkas sumber belum diunggah"
                emptyDescription="Unggah berkas asli untuk memulai pemeriksaan struktur dan menyiapkan distribusi dataset."
              />
            </div>
            {!mayUploadSource && workSourceReady ? (
              <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
                Berkas sumber versi ini sudah berhasil diproses. Langkah
                berikutnya adalah melengkapi metadata yang masih kurang atau
                mengajukan dataset untuk pemeriksaan.
              </p>
            ) : null}
          </section>

          <section
            id="dataset-distributions"
            className="scroll-mt-24 rounded-card border bg-white p-5 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Distribusi dataset
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Berkas hasil pengolahan
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                  File hasil konversi atau format siap pakai yang dibuat dari
                  sumber. Status pemrosesan menunjukkan apakah distribusi siap
                  digunakan.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-line bg-surface-secondary px-3 py-1.5 text-xs font-semibold">
                {distributionResources.length} distribusi
              </span>
            </div>
            <div className="mt-4">
              <PortalDataTable
                caption="Distribusi hasil pengolahan dataset"
                rows={distributionResources}
                alwaysShowFilters={["format", "conversion_status"]}
                filterLabelOverrides={{
                  format: "Format",
                  conversion_status: "Status",
                }}
                columns={[
                  {
                    key: "original_filename",
                    label: "Nama distribusi",
                    render: (resource) => (
                      <div className="portal-dataset-title-cell">
                        <span className="portal-table-primary-link">
                          {resource.name ||
                            resource.original_filename ||
                            "Distribusi data"}
                        </span>
                        <span className="portal-table-subtext">
                          Dari sumber versi {resource.dataset_version}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "format",
                    label: "Format",
                    render: (resource) => resource.format || "Belum diketahui",
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
                          ? "Siap digunakan"
                          : resource.conversion_status === "failed"
                            ? "Gagal"
                            : "Diproses"}
                      </Badge>
                    ),
                  },
                ]}
                emptyTitle="Belum ada distribusi siap pakai"
                emptyDescription="Distribusi akan muncul di sini setelah berkas sumber selesai diproses. Sumber asli tetap tercatat di bagian sebelumnya."
              />
            </div>
          </section>

          <section
            id="dataset-versions"
            className="scroll-mt-24 rounded-card border bg-white p-5 sm:p-7"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Riwayat versi
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Riwayat versi dataset
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Setiap versi menyimpan ringkasan perubahan, sumber, waktu
              pembuatan, dan status rilis. Versi terdahulu tetap tersedia
              sebagai jejak audit.
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
                emptyDescription="Versi akan tercatat saat sumber pertama kali didaftarkan atau versi baru dibuat."
              />
            </div>
          </section>
        </div>
        <aside
          id="dataset-review"
          className="h-fit scroll-mt-24 rounded-card border bg-white p-5"
        >
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
                      : query.action_success === "review_returned"
                        ? "Dataset dikembalikan untuk perbaikan. Catatan pemeriksaan dan versi yang sedang dikerjakan tetap tersimpan."
                        : "Dataset berhasil dipublikasikan."}
            </p>
          ) : null}
          {(data.status === "draft" || isNewVersionInProgress) &&
          !isInReview ? (
            <section
              className="mt-4 rounded-xl border border-[#d8e4eb] bg-[#f7fafc] p-4"
              aria-labelledby="dataset-review-checklist-title"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3
                    id="dataset-review-checklist-title"
                    className="text-sm font-semibold text-ink"
                  >
                    Kelengkapan sebelum pemeriksaan
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {reviewMetadata.length - missingReviewMetadata.length} dari{" "}
                    {reviewMetadata.length} metadata wajib sudah terisi. Berkas
                    sumber dan validasi otomatis juga harus siap. Metadata SDI
                    lanjutan hanya diisi berdasarkan rujukan resmi.
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${reviewRequirementsComplete ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}
                >
                  {reviewRequirementsComplete ? "Siap diajukan" : "Belum siap"}
                </span>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {reviewMetadata.map((field) => (
                  <li key={field.key} className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${field.complete ? "bg-emerald-700 text-white" : "bg-white text-[#748796] ring-1 ring-[#d4dfe6]"}`}
                    >
                      {field.complete ? "✓" : "•"}
                    </span>
                    <span
                      className={
                        field.complete ? "text-[#285943]" : "text-muted"
                      }
                    >
                      {field.label}
                    </span>
                  </li>
                ))}
              </ul>
              <ul className="mt-3 space-y-2 border-t border-[#d8e4eb] pt-3 text-sm">
                <li className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${workSourceReady ? "bg-emerald-700 text-white" : "bg-white text-[#748796] ring-1 ring-[#d4dfe6]"}`}
                  >
                    {workSourceReady ? "✓" : "•"}
                  </span>
                  <span
                    className={
                      workSourceReady ? "text-[#285943]" : "text-muted"
                    }
                  >
                    {sourceChecklistLabel}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${validationPassed ? "bg-emerald-700 text-white" : "bg-white text-[#748796] ring-1 ring-[#d4dfe6]"}`}
                  >
                    {validationPassed ? "✓" : "•"}
                  </span>
                  <span
                    className={
                      validationPassed ? "text-[#285943]" : "text-muted"
                    }
                  >
                    {validationChecklistLabel}
                  </span>
                </li>
              </ul>
              {(data.status === "draft" || isNewVersionInProgress) &&
              missingReviewMetadata.length ? (
                <Link
                  href={`/portal/dataset/${data.id}/edit`}
                  prefetch={false}
                  className="mt-3 inline-flex text-sm font-semibold text-primary underline underline-offset-2"
                >
                  Lengkapi informasi
                </Link>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-muted">
                Semua informasi ini harus lengkap dan berkas sumber harus lolos
                validasi sebelum pengajuan dapat diproses.
              </p>
            </section>
          ) : null}
          {isInReview && canReview ? (
            <form
              action={returnDatasetForChangesAction}
              className="mt-5 border-t pt-4"
            >
              <input type="hidden" name="dataset_id" value={data.id} />
              <label
                htmlFor="dataset-return-reason"
                className="block text-sm font-medium"
              >
                Catatan perbaikan
              </label>
              <p className="mt-1 text-xs leading-5 text-muted">
                Jelaskan apa yang perlu diperbaiki. Dataset akan kembali ke draf
                agar pengelola dapat memperbaruinya.
              </p>
              <textarea
                id="dataset-return-reason"
                name="reason"
                required
                minLength={5}
                maxLength={1000}
                rows={3}
                className="mt-2 w-full rounded-control border border-line bg-white px-3 py-2.5 text-sm leading-6"
                placeholder="Contoh: Perjelas sumber data dan sesuaikan periode dengan publikasi resmi."
              />
              <FormSubmitButton
                className="mt-3 w-full rounded-control border px-4 py-3 text-sm font-semibold hover:bg-slate-50"
                pendingText="Mengembalikan untuk perbaikan…"
              >
                Kembalikan untuk perbaikan
              </FormSubmitButton>
            </form>
          ) : null}
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
          {hasEditableWorkDraft ? (
            <form action={submitForReviewAction} className="mt-5 border-t pt-4">
              <input type="hidden" name="dataset_id" value={data.id} />
              <FormSubmitButton
                disabled={!maySubmitForReview}
                title={
                  !maySubmitForReview
                    ? "Lengkapi metadata wajib, pastikan sumber selesai diproses, dan validasi otomatis lulus terlebih dahulu."
                    : undefined
                }
                className="w-full rounded-control border px-4 py-3 text-sm font-semibold hover:bg-slate-50"
                pendingText="Mengirim untuk pemeriksaan…"
              >
                {isNewVersionInProgress
                  ? "Ajukan versi baru untuk pemeriksaan"
                  : "Ajukan pemeriksaan"}
              </FormSubmitButton>
              {!maySubmitForReview ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  Tombol aktif setelah seluruh metadata wajib lengkap, berkas
                  sumber selesai diproses, dan validasi otomatis berstatus
                  lulus.
                </p>
              ) : null}
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
          ) && ["draft", "published"].includes(data.status) ? (
            <DatasetArchiveAction id={data.id} status={data.status} />
          ) : null}
        </aside>
      </div>
    </>
  );
}
