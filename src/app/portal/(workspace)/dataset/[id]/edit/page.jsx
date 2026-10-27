import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { DatasetMetadataForm } from "@/components/admin/dataset-metadata-form";
import { assertBackendQuery } from "@/lib/backend/query-guard";
import { getVerifiedSdiRegistryOptions } from "@/lib/sdi/registry-options";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ubah informasi dataset",
  robots: { index: false, follow: false },
};
const datasetEditErrorMessages = {
  forbidden: "Akun Anda belum memiliki akses untuk mengubah dataset ini.",
  not_found:
    "Dataset atau organisasi tidak lagi tersedia. Kembali ke daftar untuk memeriksa data terbaru.",
  validation_failed:
    "Sebagian informasi belum memenuhi aturan data. Periksa kembali nilai dan periode.",
  validation:
    "Sebagian informasi belum memenuhi aturan data. Periksa kembali nilai dan periode.",
  conflict:
    "Data mungkin sudah berubah sejak halaman ini dibuka. Muat ulang, periksa informasi terbaru, lalu coba lagi.",
  service_unavailable:
    "Layanan basis data sedang bermasalah. Perubahan belum dapat dikonfirmasi; muat ulang halaman sebelum mengirim ulang.",
};
export default async function EditDatasetPage({ params, searchParams }) {
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
      "id,title,description,organization_id,category,source_name,source_url,geographic_scope,license_text,update_frequency,reference_period_start,reference_period_end,unit,keywords,methodology,status,current_version",
    )
    .eq("id", id)
    .maybeSingle();
  assertBackendQuery(error, "portal_dataset_edit_detail");
  if (!data) notFound();
  const { data: sdiMetadata, error: sdiMetadataError } = await supabase
    .from("dataset_sdi_metadata")
    .select(
      "ddp_id,ddp_name,source_reference,available_year,sds_code,sds_type,sds_version,standard_concept,standard_definition,measurement,presentation_classification,reference_code,reference_code_version,method_description,sds_registry_id,reference_system_id",
    )
    .eq("dataset_id", id)
    .eq("dataset_version", data.current_version)
    .maybeSingle();
  assertBackendQuery(sdiMetadataError, "portal_dataset_edit_sdi_metadata");
  const initial = { ...data, sdi_metadata: sdiMetadata || {} };
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("role,organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true);
  assertBackendQuery(membershipsError, "portal_dataset_edit_memberships");
  const mayManageGlobally = memberships?.some((m) =>
    ["super_admin", "data_admin"].includes(m.role),
  );
  const mayManageOrganization = memberships?.some(
    (m) =>
      m.organization_id === data.organization_id &&
      ["admin_opd", "editor"].includes(m.role),
  );
  if (!mayManageGlobally && !mayManageOrganization) notFound();
  if (data.status !== "draft") redirect(`/portal/dataset/${id}`);
  const { standards, referenceSystems } =
    await getVerifiedSdiRegistryOptions(supabase);
  return (
    <>
      <Link
        href={`/portal/dataset/${id}`}
        className="text-sm font-medium text-primary"
      >
        ← Kembali ke dataset
      </Link>
      <PageHeading
        eyebrow="Informasi dataset"
        title="Ubah informasi dataset"
        description="Di halaman ini, Anda dapat mengubah dataset yang masih berstatus Draf. Jika dataset sudah diajukan, buka halaman detail untuk melihat status pemeriksaan dan langkah selanjutnya."
      />
      <PortalContextGuide />

      <DatasetMetadataForm
        id={data.id}
        initial={initial}
        standards={standards}
        referenceSystems={referenceSystems}
        initialError={
          query?.error
            ? datasetEditErrorMessages[query.error] ||
              "Informasi dataset belum tersimpan. Periksa nilai, periode, dan coba kembali."
            : ""
        }
        initialStatusUnknown={query?.error === "service_unavailable"}
      />
    </>
  );
}
