import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Database,
  FileClock,
  FileSpreadsheet,
  Plus,
  UserRoundCog,
} from "lucide-react";
import { backendData } from "@/lib/backend/server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { buildDashboardViewModel } from "@/lib/admin/dashboard-view-model";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PortalDataTable } from "@/components/admin/portal-data-table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ringkasan pengelola",
  robots: { index: false, follow: false },
};

const ROLE_LABELS = {
  super_admin: "Administrator utama",
  data_admin: "Pengelola data",
  admin_opd: "Admin perangkat daerah",
  reviewer: "Pemeriksa data",
  editor: "Penyunting data",
  viewer: "Pembaca data",
  auditor: "Auditor",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
  });
}

function DashboardMetric({
  title,
  value,
  description,
  icon: Icon,
  tone = "blue",
}) {
  const tones = {
    blue: "bg-[#e7f2f8] text-[#246487]",
    amber: "bg-[#f8f0d9] text-[#85641f]",
    green: "bg-[#e6f3e9] text-[#2b714b]",
  };
  return (
    <Card className="border-[#dce5eb] bg-white shadow-none">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <p className="text-sm font-medium text-muted">{title}</p>
        <span
          className={`flex size-9 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">
          {value === null ? "—" : value.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function PortalHomePage() {
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");

  // One authenticated API response supplies the profile, memberships, and
  // permission-scoped counts/recent records. Laravel remains authoritative.
  let dashboard = null;
  let dashboardError = false;
  try {
    dashboard = await backendData("/api/v1/portal/dashboard");
  } catch {
    dashboardError = true;
  }
  const profile = dashboard?.profile ?? null;
  const memberships = Array.isArray(dashboard?.memberships)
    ? dashboard.memberships
    : null;
  const summary = dashboard?.summary ?? null;
  const model = buildDashboardViewModel({
    memberships,
    summary,
    error: dashboardError,
  });
  const { counts, nextTask } = model;
  const recentDatasets = model.latestDatasets;
  const roleLabel = model.roles
    .map((role) => ROLE_LABELS[role] || role)
    .join(" · ");
  const displayName =
    profile?.display_name?.trim() || user.email || "Pengelola data";

  const shortcutCards = [
    model.canCreateDataset
      ? {
          key: "dataset",
          icon: Database,
          title: "Kelola dataset",
          description:
            "Buat draf, lengkapi metadata, dan pantau pemrosesan berkas sumber.",
          href: "/portal/dataset",
          action: "Buka katalog",
        }
      : null,
    model.canReviewQueue
      ? {
          key: "review",
          icon: ClipboardCheck,
          title: "Pemeriksaan data",
          description:
            "Tinjau kelengkapan metadata dan sumber sebelum keputusan publikasi.",
          href: "/portal/review",
          action: "Buka antrean",
        }
      : null,
    model.canManageIntegrations
      ? {
          key: "integration",
          icon: FileSpreadsheet,
          title: "Kesiapan pertukaran data",
          description:
            "Periksa metadata SDI, standar, kode referensi, dan integrasi katalog.",
          href: "/portal/integrasi",
          action: "Periksa kesiapan",
        }
      : null,
    model.canViewUserAccess
      ? {
          key: "users",
          icon: UserRoundCog,
          title: model.canManageUsers
            ? "Pengguna dan akses"
            : "Audit akses pengguna",
          description: model.canManageUsers
            ? "Tinjau penugasan peran dan organisasi sesuai kebutuhan pekerjaan."
            : "Tinjau penugasan peran dan organisasi tanpa mengubah hak akses.",
          href: "/portal/pengguna",
          action: model.canManageUsers ? "Kelola akses" : "Lihat daftar akses",
        }
      : null,
  ].filter(Boolean);

  return (
    <>
      <section
        id="portal-dashboard-overview"
        className="portal-dashboard-heading mb-5 rounded-2xl border border-[#d8e4eb] bg-white p-5 sm:p-7"
        aria-labelledby="portal-dashboard-title"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="eyebrow">Ringkasan pengelola</p>
            <h1
              id="portal-dashboard-title"
              className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Selamat datang
            </h1>
            <p className="mt-2 flex min-h-6 max-w-2xl min-w-0 items-center gap-1.5 text-sm leading-6 text-muted">
              <span className="shrink-0 font-medium text-ink">Akun:</span>
              <span className="min-w-0 truncate">{displayName}</span>
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Lihat daftar dataset, status pemeriksaan, dan pekerjaan yang masih
              perlu diselesaikan.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-8 items-center rounded-full border border-[#dce7ee] bg-[#f7fafc] px-3 py-1.5 text-xs font-medium text-[#49677b]">
                {roleLabel || "Peran aktif belum tersedia"}
              </span>
              {model.globalMembership ? (
                <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#dce7ee] bg-white px-3 py-1.5 text-xs font-medium text-[#49677b]">
                  <CheckCircle2 size={13} aria-hidden="true" /> Cakupan lintas
                  organisasi
                </span>
              ) : null}
            </div>
          </div>
          {model.canCreateDataset ? (
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Button href="/portal/dataset/new">
                <Plus size={16} aria-hidden="true" />
                Buat dataset
              </Button>
              <Link
                href="/portal/dataset"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                Lihat katalog <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <Link
              href="/portal/dataset"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary"
            >
              Lihat katalog <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>

      <PortalContextGuide />

      {!model.membershipDataAvailable ? (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-950"
        >
          <CircleAlert
            size={18}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">
              Informasi akses belum berhasil dimuat
            </p>
            <p className="mt-1">
              Status organisasi dan ringkasan tidak ditampilkan sebagai angka
              nol. Muat ulang halaman; jika masalah berlanjut, periksa koneksi
              API atau hubungi administrator.
            </p>
          </div>
        </div>
      ) : !model.hasScope ? (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3.5 text-sm leading-6 text-sky-950"
        >
          <CircleAlert
            size={18}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">Akses organisasi belum tersedia</p>
            <p className="mt-1">
              Akun ini belum memiliki keanggotaan aktif pada organisasi atau
              peran global. Administrator portal perlu menetapkan akses yang
              sesuai.
            </p>
          </div>
        </div>
      ) : dashboardError || !model.summaryAvailable ? (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-950"
        >
          <CircleAlert
            size={18}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">Ringkasan belum berhasil dimuat</p>
            <p className="mt-1">
              Angka ditandai dengan tanda pisah, bukan nol. Coba muat ulang atau
              periksa status layanan API.
            </p>
          </div>
        </div>
      ) : null}

      <section
        aria-label="Ringkasan data"
        className="portal-dashboard-kpis grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <DashboardMetric
          title="Dataset dalam cakupan"
          value={counts.total}
          description="Dataset yang dapat dibaca akun ini"
          icon={Database}
          tone="blue"
        />
        <DashboardMetric
          title="Perlu diperiksa"
          value={counts.review}
          description="Perlu ditinjau sebelum keputusan berikutnya"
          icon={ClipboardCheck}
          tone="amber"
        />
        <DashboardMetric
          title="Masih dikerjakan"
          value={counts.draft}
          description="Draf yang belum diajukan untuk diperiksa"
          icon={FileClock}
          tone="green"
        />
      </section>

      <section
        className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]"
        aria-labelledby="portal-next-task-title"
      >
        <article className="rounded-2xl border border-[#d7e4eb] bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f2f8] text-[#246487]">
              {nextTask.state === "review" ? (
                <ClipboardCheck size={19} aria-hidden="true" />
              ) : nextTask.state === "draft" || nextTask.state === "empty" ? (
                <Database size={19} aria-hidden="true" />
              ) : (
                <FileClock size={19} aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#55788d]">
                Langkah berikutnya
              </p>
              <h2
                id="portal-next-task-title"
                className="mt-1 text-lg font-semibold leading-7"
              >
                {nextTask.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                {nextTask.description}
              </p>
              <Link
                href={nextTask.href}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {nextTask.action} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </article>
        <aside
          className="rounded-2xl border border-[#dce5eb] bg-[#f8fbfd] p-5 sm:p-6"
          aria-labelledby="portal-quick-actions-title"
        >
          <h2
            id="portal-quick-actions-title"
            className="text-base font-semibold"
          >
            Akses cepat
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            Pintasan sesuai peran yang terdeteksi pada akun Anda.
          </p>
          <div className="mt-3 divide-y divide-[#e2eaf0]">
            {shortcutCards
              .slice(0, 3)
              .map(({ key, icon: Icon, title, description, href, action }) => (
                <Link
                  key={key}
                  href={href}
                  className="group flex items-start gap-3 py-3 first:pt-1 last:pb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#2c6787] ring-1 ring-[#dce7ee]">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">
                      {description}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      {action} <ArrowRight size={12} aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              ))}
            {shortcutCards.length === 0 ? (
              <p className="py-3 text-sm leading-6 text-muted">
                Pintasan pengelolaan akan muncul sesuai akses yang diberikan.
                Anda tetap dapat menelusuri katalog.
              </p>
            ) : null}
          </div>
          {model.canManageUsers && shortcutCards.length > 3 ? (
            <Link
              href="/portal/pengguna"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
              Kelola pengguna dan akses{" "}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          ) : null}
        </aside>
      </section>

      <section
        className="mt-6 overflow-hidden rounded-2xl border border-[#dce5eb] bg-white"
        aria-labelledby="portal-recent-datasets-title"
      >
        <div className="flex flex-col gap-3 border-b border-[#e6edf2] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 id="portal-recent-datasets-title" className="font-semibold">
              Dataset terbaru
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted">
              Delapan dataset terakhir yang berada dalam cakupan akses Anda.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            href="/portal/dataset"
          >
            Lihat katalog lengkap <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {!model.hasScope ? (
          <div className="px-5 py-6 text-sm leading-6 text-muted">
            Daftar akan tersedia setelah administrator menetapkan organisasi
            atau peran global yang sesuai.
          </div>
        ) : dashboardError || !model.summaryAvailable ? (
          <div className="portal-state-panel portal-state-error" role="alert">
            <h3>Dataset terbaru belum dapat ditampilkan</h3>
            <p>
              Ringkasan dari API belum berhasil dimuat. Muat ulang halaman
              sebelum mengambil keputusan berdasarkan status data.
            </p>
          </div>
        ) : (
          <PortalDataTable
            caption="Dataset terbaru"
            rows={recentDatasets}
            alwaysShowFilters={["status"]}
            filterLabelOverrides={{ status: "Status" }}
            columns={[
              {
                key: "title",
                label: "Dataset",
                render: (dataset) => (
                  <Link
                    href={`/portal/dataset/${dataset.id}`}
                    className="portal-table-primary-link"
                  >
                    {dataset.title}
                  </Link>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (dataset) => (
                  <Badge
                    variant={
                      dataset.status === "published"
                        ? "success"
                        : dataset.status === "review"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {{
                      published: "Terbit",
                      review: "Menunggu pemeriksaan",
                      archived: "Diarsipkan",
                      draft: "Draf",
                    }[dataset.status] || dataset.status}
                  </Badge>
                ),
              },
              {
                key: "updated_at",
                label: "Diperbarui",
                render: (dataset) => formatDate(dataset.updated_at),
              },
              {
                key: "actions",
                label: "Tindakan",
                render: (dataset) => (
                  <Link
                    className="portal-table-action"
                    href={`/portal/dataset/${dataset.id}`}
                  >
                    Buka <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                ),
              },
            ]}
            emptyTitle="Belum ada dataset yang dapat Anda akses"
            emptyDescription="Dataset akan muncul di sini setelah dibuat atau aksesnya diberikan kepada organisasi Anda."
          />
        )}
      </section>
    </>
  );
}
