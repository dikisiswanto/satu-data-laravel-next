import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileWarning,
  Layers3,
  MapPinned,
} from "lucide-react";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { assertBackendQuery } from "@/lib/backend/query-guard";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kualitas dan siklus data",
  robots: { index: false, follow: false },
};

export default async function DataQualityPage() {
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);
  assertBackendQuery(membershipError, "portal_quality_memberships");
  if (
    !(memberships || []).some((item) =>
      [
        "super_admin",
        "data_admin",
        "admin_opd",
        "reviewer",
        "editor",
        "auditor",
      ].includes(item.role),
    )
  )
    redirect("/portal");
  const [summaryResult, runsResult] = await Promise.all([
    supabase.rpc("get_sdi_quality_summary"),
    supabase
      .from("sdi_harvest_runs")
      .select(
        "id,target,status,started_at,finished_at,requested_by,summary,sample_issues",
      )
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  assertBackendQuery(summaryResult.error, "portal_quality_summary");
  // RLS intentionally returns no run history to users without global administration/audit scope.
  const summary = Array.isArray(summaryResult.data)
    ? summaryResult.data[0]
    : summaryResult.data;
  const metrics = summary || {};
  return (
    <>
      <PageHeading
        eyebrow="Pemantauan"
        title="Kualitas dan siklus data"
        description="Ringkasan ini menunjukkan hal-hal yang masih perlu diperiksa atau diperbaiki. Angkanya berasal dari pemeriksaan portal dan bukan sertifikasi kepatuhan dari instansi nasional."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          icon={Layers3}
          label="Dataset dapat diakses"
          value={metrics.visible_datasets ?? "—"}
          detail={`${metrics.published_datasets ?? 0} dataset telah terbit`}
        />
        <Metric
          icon={FileWarning}
          label="Metadata SDI belum lengkap"
          value={metrics.missing_sdi_metadata ?? "—"}
          detail="Dataset terbit yang belum memenuhi profil kelengkapan lokal"
          warning={Number(metrics.missing_sdi_metadata) > 0}
          href="/portal/integrasi"
          action="Periksa kelengkapan"
        />
        <Metric
          icon={AlertTriangle}
          label="Berkas pada versi aktif perlu diperiksa"
          value={metrics.missing_current_resource ?? "—"}
          detail="Belum ada berkas publik yang berhasil diproses pada versi aktif"
          warning={Number(metrics.missing_current_resource) > 0}
          href="/portal/dataset"
          action="Periksa dataset"
        />
        <Metric
          icon={CalendarClock}
          label="Melewati jadwal pembaruan"
          value={metrics.overdue_datasets ?? "—"}
          detail="Berdasarkan frekuensi dan waktu pembaruan terakhir"
          warning={Number(metrics.overdue_datasets) > 0}
          href="/portal/dataset"
          action="Tinjau jadwal"
        />
        <Metric
          icon={CheckCircle2}
          label="Indikator statistik terbit"
          value={metrics.published_indicators ?? "—"}
          detail="Indikator yang terlihat secara publik"
          href="/portal/statistik"
          action="Kelola indikator"
        />
        <Metric
          icon={FileWarning}
          label="Indikator tanpa observasi terbit"
          value={metrics.indicators_without_observations ?? "—"}
          detail="Indikator publik yang belum memiliki seri observasi aktif"
          warning={Number(metrics.indicators_without_observations) > 0}
          href="/portal/statistik"
          action="Tambahkan observasi"
        />
        <Metric
          icon={MapPinned}
          label="Referensi siap dipakai"
          value={`${metrics.verified_standards ?? 0} standar · ${metrics.verified_reference_systems ?? 0} sistem kode`}
          detail="Hanya catatan internal yang telah diverifikasi dan masih berlaku"
          href="/portal/standar"
          action="Kelola referensi"
        />
        <Metric
          icon={FileWarning}
          label="Dataset tanpa tautan standar aktif"
          value={metrics.datasets_without_verified_sds_registry ?? "—"}
          detail="Catatan teks belum cukup; pilih versi standar yang telah diverifikasi"
          warning={Number(metrics.datasets_without_verified_sds_registry) > 0}
          href="/portal/integrasi"
          action="Tautkan standar"
        />
        <Metric
          icon={FileWarning}
          label="Dataset tanpa sistem kode aktif"
          value={metrics.datasets_without_verified_reference_system ?? "—"}
          detail="Hubungkan kode referensi ke registri yang masih berlaku"
          warning={
            Number(metrics.datasets_without_verified_reference_system) > 0
          }
          href="/portal/integrasi"
          action="Tautkan referensi"
        />
      </div>
      <section className="portal-workspace-panel mt-7">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">
              Tindak lanjut yang disarankan
            </h2>
            <p className="mt-1 text-sm text-muted">
              Mulai dari hal yang bisa diperbaiki dengan merujuk pada dokumen
              dan sumber resmi.
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          <Action
            href="/portal/integrasi"
            title="Lengkapi metadata untuk berbagi data"
            description="Lengkapi informasi yang masih kosong dan periksa berkas pada versi aktif sebelum menguji pengambilan data oleh sistem lain."
          />
          <Action
            href="/portal/standar"
            title="Tinjau registri standar dan kode"
            description="Cantumkan sumber resmi, dokumen bukti, versi, dan masa berlaku referensi."
          />
          <Action
            href="/portal/statistik"
            title="Tambahkan observasi indikator"
            description="Catat nilai untuk tiap periode dan wilayah agar perubahan dari waktu ke waktu bisa ditampilkan dengan benar."
          />
          <Action
            href="/portal/dataset"
            title="Periksa jadwal pembaruan"
            description="Periksa dataset yang melewati jadwal pembaruan atau belum memiliki sumber yang dapat dibuka."
          />
        </div>
      </section>
      <section className="portal-workspace-panel mt-7">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">
              Riwayat pemeriksaan integrasi
            </h2>
            <p className="mt-1 text-sm text-muted">
              Ini adalah hasil pemeriksaan dari Portal Wajo. Hasil ini belum
              menunjukkan bahwa katalog sudah diambil oleh sistem nasional.
            </p>
          </div>
          <Link
            href="/portal/integrasi"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            Buka integrasi <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {runsResult.error ? (
          <p className="p-4 text-sm text-muted">
            Kami belum dapat memuat riwayat pemeriksaan. Coba lagi beberapa saat
            lagi. Jika masalah tetap muncul setelah pembaruan sistem, hubungi
            administrator portal.
          </p>
        ) : (runsResult.data || []).length ? (
          <div className="divide-y divide-line">
            {runsResult.data.map((run) => (
              <div
                key={run.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {targetLabel(run.target)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(run.finished_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Makassar",
                    })}{" "}
                    WITA
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {run.summary?.eligible_count ?? 0} layak ·{" "}
                    {run.summary?.issue_count ?? 0} temuan
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${run.status === "passed" ? "bg-emerald-50 text-emerald-800" : run.status === "warnings" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"}`}
                >
                  {run.status === "passed"
                    ? "Lulus pemeriksaan"
                    : run.status === "warnings"
                      ? "Perlu ditinjau"
                      : "Gagal"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted">
            Belum ada hasil pemeriksaan. Buka halaman Integrasi SDI dan pilih
            “Periksa sekarang” untuk memulai.
          </p>
        )}
      </section>
      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted">
        <AlertTriangle
          size={15}
          className="mt-0.5 shrink-0"
          aria-hidden="true"
        />
        Jadwal yang terlewat adalah pengingat untuk meninjau data, bukan bukti
        bahwa datanya salah. Untuk dataset yang hanya dikumpulkan sekali atau
        memiliki pengecualian resmi, gunakan jadwal yang sesuai dengan ketentuan
        sektornya.
      </p>
    </>
  );
}

function targetLabel(target) {
  return (
    {
      sdi_flat: "Profil JSON datar SDI",
      dcat_jsonld: "Katalog DCAT/JSON-LD",
      geoportal: "Manifest GeoPortal",
    }[target] || target
  );
}
function Metric({ icon: Icon, label, value, detail, warning, href, action }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon size={17} aria-hidden="true" />
        {label}
      </div>
      <p
        className={`mt-2 text-3xl font-semibold tracking-tight ${warning ? "text-amber-800" : "text-ink"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
      {href ? (
        <Link
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          href={href}
        >
          {action} <ArrowRight size={13} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
function Action({ href, title, description }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-line p-4 transition hover:border-primary/40 hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <h3 className="font-semibold group-hover:text-primary">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
        Buka halaman <ArrowRight size={13} aria-hidden="true" />
      </span>
    </Link>
  );
}
