import { Database, Building2 } from "lucide-react";
import { safeHttpUrl } from "@/lib/utils";
import { redirect } from "next/navigation";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { PortalShell } from "@/components/portal-shell";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { DatasetCreateForm } from "@/components/admin/dataset-create-form";
import { Button } from "@/components/ui/button";
import { assertBackendQuery } from "@/lib/backend/query-guard";
import { datasetStarterReferences } from "@/lib/data/dataset-starter-references";
import { DatasetPreparationAssistant } from "@/components/admin/dataset-preparation-assistant";
import { getVerifiedSdiRegistryOptions } from "@/lib/sdi/registry-options";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Dataset baru",
  robots: { index: false, follow: false },
};
const datasetCreateErrorMessages = {
  forbidden:
    "Akun Anda belum memiliki akses untuk membuat dataset pada organisasi tersebut.",
  authorization_unavailable:
    "Kewenangan atau daftar organisasi belum dapat diverifikasi. Muat ulang halaman sebelum mencoba kembali.",
  not_found:
    "Organisasi tidak ditemukan atau sudah tidak aktif. Muat ulang daftar organisasi lalu pilih kembali.",
  validation_failed:
    "Periksa judul, organisasi pengampu, atau format informasi yang Anda isi. Metadata lanjutan tidak wajib untuk menyimpan draf.",
  validation:
    "Periksa judul, organisasi pengampu, atau format informasi yang Anda isi. Metadata lanjutan tidak wajib untuk menyimpan draf.",
  conflict:
    "Informasi berubah saat formulir sedang disimpan. Periksa kembali isian terbaru, lalu coba lagi.",
  service_unavailable:
    "Layanan basis data sedang bermasalah. Perubahan belum dapat dikonfirmasi; buka daftar dataset sebelum mengirim ulang.",
};
export default async function NewDatasetPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("organization_id,role")
    .eq("user_id", user.id)
    .eq("is_active", true);
  assertBackendQuery(membershipsError, "portal_dataset_new_memberships");
  const globalAdmin = (memberships || []).some((membership) =>
    ["super_admin", "data_admin"].includes(membership.role),
  );
  let orgs = [];
  if (globalAdmin) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id,name")
      .eq("is_active", true)
      .order("name");
    assertBackendQuery(error, "portal_dataset_new_organizations");
    orgs = data || [];
  } else {
    const orgIds = (memberships || [])
      .filter((membership) => ["admin_opd", "editor"].includes(membership.role))
      .map((membership) => membership.organization_id)
      .filter(Boolean);
    if (orgIds.length) {
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name")
        .in("id", orgIds)
        .eq("is_active", true)
        .order("name");
      assertBackendQuery(error, "portal_dataset_new_organizations");
      orgs = data || [];
    }
  }
  const { standards, referenceSystems } =
    await getVerifiedSdiRegistryOptions(supabase);
  return (
    <PortalShell email={user.email}>
      <PageHeading
        eyebrow="Pengelolaan data"
        title={
          <span className="inline-flex items-center gap-2">
            <Database size={22} aria-hidden="true" />
            Buat dataset
          </span>
        }
        description="Mulai dengan informasi dasar dataset. Jika perlu, unduh template untuk menata kolom. Metadata standar nasional dapat dilengkapi setelah rujukan resminya tersedia. Dataset baru tampil di portal publik setelah selesai diperiksa dan diterbitkan."
      />
      <PortalContextGuide />

      <details className="mb-4 max-w-3xl rounded-2xl border border-[#d7e7e1] bg-[#f1f8f4] p-4 sm:p-5">
        <summary className="cursor-pointer font-semibold text-[#214f3c]">
          Sumber resmi untuk membantu memeriksa data
        </summary>
        <p className="mt-2 text-sm leading-6 text-[#456857]">
          Buka rujukan ini untuk memeriksa definisi, angka, dan asal data.
          Daftar ini bukan dataset yang sudah diimpor atau ditetapkan sebagai
          prioritas resmi.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {datasetStarterReferences
            .filter((reference) => safeHttpUrl(reference.source_url))
            .slice(0, 6)
            .map((reference) => (
              <a
                key={reference.code}
                href={safeHttpUrl(reference.source_url)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[#d7e7e1] bg-white p-3 transition hover:border-[#80ad98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d47]"
              >
                <span className="block text-sm font-semibold text-[#214f3c]">
                  {reference.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#567363]">
                  {reference.source_name}
                  {reference.reference_year
                    ? ` · ${reference.reference_year}`
                    : ""}
                </span>
              </a>
            ))}
        </div>
      </details>
      {orgs.length ? (
        <DatasetCreateForm
          orgs={orgs}
          standards={standards}
          referenceSystems={referenceSystems}
          initialError={
            params?.error
              ? datasetCreateErrorMessages[params.error] ||
                "Formulir belum dapat disimpan. Periksa isian dan coba kembali."
              : ""
          }
          initialStatusUnknown={params?.error === "service_unavailable"}
        />
      ) : (
        <section
          role="status"
          className="max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6"
          aria-labelledby="dataset-org-required-title"
        >
          <div className="flex items-start gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-800 ring-1 ring-amber-200"
              aria-hidden="true"
            >
              <Building2 size={20} />
            </span>
            <div className="min-w-0">
              <h2
                id="dataset-org-required-title"
                className="text-base font-semibold text-amber-950"
              >
                Organisasi pengampu belum tersedia
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Dataset perlu memiliki organisasi pengampu yang jelas agar
                sumber data dan penanggung jawabnya dapat ditelusuri. Anda belum
                memiliki organisasi aktif yang dapat dipilih.
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                {globalAdmin
                  ? "Tambahkan atau aktifkan organisasi terlebih dahulu, lalu kembali untuk membuat dataset."
                  : "Minta administrator menetapkan keanggotaan organisasi dan peran pengelolaan data untuk akun Anda."}
              </p>
              {globalAdmin ? (
                <Button
                  href="/portal/organisasi/baru"
                  className="mt-4"
                  variant="secondary"
                >
                  <Building2 size={16} aria-hidden="true" />
                  Tambah organisasi
                </Button>
              ) : (
                <Button href="/portal" className="mt-4" variant="secondary">
                  Kembali ke ringkasan
                </Button>
              )}
            </div>
          </div>
        </section>
      )}
      <DatasetPreparationAssistant />
    </PortalShell>
  );
}
