import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { SdiMetadataEditor } from "@/components/admin/sdi-metadata-editor";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalData } from "@/lib/backend/portal-api";
import { getVerifiedSdiRegistryOptions } from "@/lib/sdi/registry-options";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Metadata pertukaran dataset",
  robots: { index: false, follow: false },
};

export default async function EditSdiMetadataPage({ params }) {
  const { id } = await params;
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  let dataset;
  try {
    dataset = await portalData(`datasets/${encodeURIComponent(id)}`);
  } catch (error) {
    if ([403, 404].includes(error.status)) notFound();
    throw error;
  }
  if (!dataset) notFound();
  if (!["draft", "published"].includes(dataset.status))
    redirect(`/portal/dataset/${id}`);

  const { memberships = [] } = await getPortalShell();
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
  const sdiMetadata =
    (dataset.dataset_sdi_metadata || []).find(
      (item) => item.dataset_version === version,
    ) || null;

  const { standards, referenceSystems } = await getVerifiedSdiRegistryOptions();

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
