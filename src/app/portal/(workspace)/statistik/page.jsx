import { redirect } from "next/navigation";
import Link from "next/link";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalApi } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndicatorActions } from "@/components/admin/indicator-actions";
import { PortalDataTable } from "@/components/admin/portal-data-table";
import { Plus, ClipboardCheck, Database, TrendingUp } from "lucide-react";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Indikator statistik",
  robots: { index: false, follow: false },
};
export default async function IndicatorsAdminPage() {
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const { memberships = [] } = await getPortalShell();
  const globalManager = (memberships || []).some(
    (m) => !m.organization_id && ["super_admin", "data_admin"].includes(m.role),
  );
  const canCreate = (memberships || []).some((m) =>
    ["super_admin", "data_admin", "admin_opd", "editor"].includes(m.role),
  );
  const [list, draftList, reviewList, publishedList] = await Promise.all([
    portalApi("indicators?limit=500&sort=updated_desc"),
    portalApi("indicators?status=draft&limit=1"),
    portalApi("indicators?status=review&limit=1"),
    portalApi("indicators?status=published&limit=1"),
  ]);
  const data = list?.data || [];
  const statusSummary = [
    ["Indikator terdaftar", list?.meta?.total ?? data.length],
    [
      "Draf perlu dilengkapi",
      draftList?.meta?.total ??
        data.filter((item) => item.status === "draft").length,
    ],
    [
      "Menunggu pemeriksaan",
      reviewList?.meta?.total ??
        data.filter((item) => item.status === "review").length,
    ],
    [
      "Definisi terbit",
      publishedList?.meta?.total ??
        data.filter((item) => item.status === "published").length,
    ],
  ];
  const error = null;
  return (
    <>
      <PageHeading
        eyebrow="Statistik"
        title="Indikator statistik"
        description="Kelola definisi indikator secara terpisah dari nilai per periode. Pastikan satuan, sumber, metodologi, dan periode rujukan konsisten sebelum pemeriksaan dan publikasi."
      >
        {canCreate ? (
          <Button href="/portal/statistik/baru">
            <Plus size={16} aria-hidden="true" />
            Indikator baru
          </Button>
        ) : null}
      </PageHeading>
      <PortalContextGuide />
      <section
        aria-labelledby="indicator-workflow-title"
        className="mb-6 rounded-2xl border border-line bg-white p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Alur pengelolaan
            </p>
            <h2
              id="indicator-workflow-title"
              className="mt-1 text-base font-semibold"
            >
              Dari definisi sampai tren publik
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              Definisi indikator dan nilai per periode dikelola terpisah. Ikuti
              urutan ini agar angka tidak terbit tanpa penjelasan, satuan,
              periode, dan sumber.
            </p>
          </div>
          <Link
            href="/statistik"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center gap-2 rounded-control border border-line px-3 py-2 text-xs font-semibold hover:bg-surface-secondary"
            prefetch={false}
          >
            <TrendingUp size={15} aria-hidden="true" /> Lihat laman statistik
            publik
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-line bg-surface p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-primary">
              <Database size={17} aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-sm font-semibold">
              1. Definisikan indikator
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              Nama, definisi, satuan, organisasi, dan sumber. Simpan sebagai
              draf.
            </p>
            {canCreate ? (
              <Link
                href="/portal/statistik/baru"
                prefetch={false}
                className="mt-3 inline-flex text-xs font-semibold text-primary underline underline-offset-2"
              >
                Buat indikator
              </Link>
            ) : null}
          </article>
          <article className="rounded-xl border border-line bg-surface p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
              <ClipboardCheck size={17} aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-sm font-semibold">
              2. Periksa dan terbitkan definisi
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              Ajukan draf untuk pemeriksaan. Definisi terbit menjadi dasar
              publikasi nilai statistik.
            </p>
            <a
              href="#indicator-table"
              className="mt-3 inline-flex text-xs font-semibold text-primary underline underline-offset-2"
            >
              Lihat antrean indikator
            </a>
          </article>
          <article className="rounded-xl border border-line bg-surface p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <TrendingUp size={17} aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-sm font-semibold">
              3. Kelola nilai dan tren
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              Tambahkan observasi per periode/wilayah. Terbitkan nilai satu per
              satu untuk membentuk tren publik.
            </p>
            <a
              href="#indicator-table"
              className="mt-3 inline-flex text-xs font-semibold text-primary underline underline-offset-2"
            >
              Kelola nilai
            </a>
          </article>
        </div>
      </section>
      <section
        aria-label="Ringkasan status indikator"
        className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {statusSummary.map(([label, count]) => (
          <article
            key={label}
            className="rounded-card border border-line bg-white p-4"
          >
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {count.toLocaleString("id-ID")}
            </p>
          </article>
        ))}
      </section>
      <section id="indicator-table" className="portal-workspace-panel">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Daftar indikator</h2>
            <p className="mt-1 text-sm text-muted">
              Indikator yang dapat Anda akses, beserta status pemeriksaannya.
            </p>
          </div>
          <span className="portal-result-count">
            {error
              ? "Data belum tersedia"
              : `${(data || []).length.toLocaleString("id-ID")} indikator`}
          </span>
        </div>
        {error ? (
          <div className="portal-state-panel portal-state-error" role="alert">
            <h3>Daftar indikator belum dapat ditampilkan</h3>
            <p>
              Coba muat ulang halaman beberapa saat lagi. Jika masalah tetap
              muncul, hubungi administrator portal.
            </p>
          </div>
        ) : (
          <PortalDataTable
            caption="Daftar indikator statistik"
            rows={data || []}
            alwaysShowFilters={["status", "organization_name"]}
            filterLabelOverrides={{
              status: "Status",
              organization_name: "Organisasi",
            }}
            columns={[
              {
                key: "title",
                label: "Indikator",
                render: (item) => (
                  <div className="portal-dataset-title-cell">
                    <span className="portal-table-primary-link">
                      {item.title}
                    </span>
                    <span className="portal-table-subtext">{item.code}</span>
                  </div>
                ),
              },
              {
                key: "organization",
                label: "Organisasi",
                render: (item) =>
                  item.organizations?.name || "Organisasi belum ditetapkan",
              },
              {
                key: "unit",
                label: "Satuan / periode",
                render: (item) => (
                  <div>
                    {item.unit || "Satuan belum tersedia"}
                    <span className="portal-table-subtext block">
                      {item.period_label || "Periode belum tersedia"}
                    </span>
                  </div>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (item) => (
                  <Badge
                    variant={
                      item.status === "published"
                        ? "success"
                        : item.status === "review"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {{
                      draft: "Draf",
                      review: "Menunggu pemeriksaan",
                      published: "Terbit",
                      archived: "Diarsipkan",
                    }[item.status] || item.status}
                  </Badge>
                ),
              },
              {
                key: "observations",
                label: "Nilai / tren",
                render: (item) => (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/portal/statistik/${item.id}/observasi`}
                      className="inline-flex min-h-10 max-w-full items-center justify-center rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                      prefetch={false}
                    >
                      {item.status === "published"
                        ? "Kelola nilai & tren"
                        : "Siapkan nilai"}
                    </Link>
                    {item.status === "published" && item.slug ? (
                      <Link
                        href={`/statistik/${encodeURIComponent(item.slug)}`}
                        target="_blank"
                        rel="noreferrer"
                        prefetch={false}
                        className="inline-flex min-h-10 max-w-full items-center justify-center rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                      >
                        Lihat publik
                      </Link>
                    ) : null}
                  </div>
                ),
              },
              {
                key: "actions",
                label: "Tindakan",
                render: (item) => (
                  <IndicatorActions
                    id={item.id}
                    status={item.status}
                    canEdit={
                      globalManager ||
                      (memberships || []).some(
                        (m) =>
                          m.organization_id === item.organization_id &&
                          ["admin_opd", "editor"].includes(m.role),
                      )
                    }
                    canSubmit={
                      globalManager ||
                      (memberships || []).some(
                        (m) =>
                          m.organization_id === item.organization_id &&
                          ["admin_opd", "editor"].includes(m.role),
                      )
                    }
                    canReview={
                      globalManager ||
                      (memberships || []).some(
                        (m) =>
                          m.organization_id === item.organization_id &&
                          ["admin_opd", "reviewer"].includes(m.role),
                      )
                    }
                    canPublish={
                      globalManager ||
                      (memberships || []).some(
                        (m) =>
                          m.organization_id === item.organization_id &&
                          m.role === "admin_opd",
                      )
                    }
                    canArchive={
                      globalManager ||
                      (memberships || []).some(
                        (m) =>
                          m.organization_id === item.organization_id &&
                          m.role === "admin_opd",
                      )
                    }
                  />
                ),
              },
            ]}
            emptyTitle="Belum ada indikator statistik"
            emptyDescription="Mulai dari nama, definisi, organisasi, dan satuan indikator. Nilai per periode dapat ditambahkan setelah indikator tersimpan sebagai draf."
            emptyAction={
              canCreate ? (
                <Link
                  href="/portal/statistik/baru"
                  className="portal-table-action"
                  prefetch={false}
                >
                  Buat indikator
                </Link>
              ) : null
            }
          />
        )}
      </section>
    </>
  );
}
