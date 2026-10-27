import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { SdiMetadataEditor } from "@/components/admin/sdi-metadata-editor";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { assertBackendQuery } from "@/lib/backend/query-guard";
import { getVerifiedSdiRegistryOptions } from "@/lib/sdi/registry-options";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Metadata pertukaran dataset",
  robots: { index: false, follow: false },
};

export default async function EditSdiMetadataPage({ params }) {
  const { id } = await params;
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");

  const { data: dataset, error } = await supabase
    .from("datasets")
    .select(
      "id,title,organization_id,status,current_version,draft_version,organizations(name)",
    )
    .eq("id", id)
    .maybeSingle();
  assertBackendQuery(error, "portal_sdi_dataset_detail");
  if (!dataset) notFound();
  if (!["draft", "published"].includes(dataset.status))
    redirect(`/portal/dataset/${id}`);

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("role,organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true);
  assertBackendQuery(membershipsError, "portal_sdi_memberships");
  const globalManager = (memberships || []).some((item) =>
    ["super_admin", "data_admin"].includes(item.role),
  );
  const organizationManager = (memberships || []).some(
    (item) =>
      item.organization_id === dataset.organization_id &&
      ["admin_opd", "editor"].includes(item.role),
  );
  if (!globalManager && !organizationManager) notFound();

  const version = dataset.draft_version ?? dataset.current_version;
  const { data: sdiMetadata, error: metadataError } = await supabase
    .from("dataset_sdi_metadata")
    .select(
      "ddp_id,ddp_name,source_reference,available_year,sds_code,sds_type,sds_version,standard_concept,standard_definition,measurement,presentation_classification,reference_code,reference_code_version,method_description,sds_registry_id,reference_system_id",
    )
    .eq("dataset_id", id)
    .eq("dataset_version", version)
    .maybeSingle();
  assertBackendQuery(metadataError, "portal_sdi_metadata_detail");

  const { standards, referenceSystems } =
    await getVerifiedSdiRegistryOptions(supabase);

  const versionLabel = dataset.draft_version
    ? `draf versi ${dataset.draft_version}`
    : dataset.status === "published"
      ? `versi terbit ${dataset.current_version}`
      : `draf awal versi ${dataset.current_version}`;

  return (
    <>
      <Link
        href="/portal/integrasi"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Kembali ke kesiapan integrasi
      </Link>
      <PageHeading
        eyebrow="Interoperabilitas"
        title="Metadata pertukaran SDI"
        description="Lengkapi metadata standar dan referensi yang dibutuhkan profil ekspor Satu Data Wajo. Dataset hanya masuk ekspor siap-harvest ketika seluruh field penting dan distribusi versi aktif tersedia."
      />
      <SdiMetadataEditor
        datasetId={id}
        version={version}
        datasetTitle={dataset.title}
        versionLabel={versionLabel}
        initial={sdiMetadata || {}}
        standards={standards}
        referenceSystems={referenceSystems}
      />
    </>
  );
}
