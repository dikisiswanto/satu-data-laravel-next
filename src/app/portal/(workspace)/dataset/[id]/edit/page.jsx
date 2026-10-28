import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalData } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { DatasetMetadataForm } from "@/components/admin/dataset-metadata-form";
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
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  let data;
  try {
    data = await portalData(`datasets/${encodeURIComponent(id)}`);
  } catch (error) {
    if (Number(error?.status) === 404) notFound();
    throw error;
  }
  if (!data) notFound();
  const sdiMetadata = data.sdi_metadata;
  const initial = { ...data, sdi_metadata: sdiMetadata || {} };
  const { memberships = [] } = await getPortalShell();
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
  const { standards, referenceSystems } = await getVerifiedSdiRegistryOptions();
  return (
    <>
      <Link
        href={`/portal/dataset/${id}`}
        className="text-sm font-medium text-primary"
        prefetch={false}
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
