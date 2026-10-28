"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Users,
  X,
} from "lucide-react";
import { completeOnboardingAction } from "@/app/portal/onboarding-actions";

const baseSteps = [
  {
    key: "dashboard",
    href: "/portal",
    target: "portal-dashboard-overview",
    title: "Ringkasan pekerjaan",
    body: "Mulai dari ringkasan untuk melihat dataset dalam cakupan akses, pekerjaan yang perlu diperiksa, dan pintasan ke tugas berikutnya.",
    icon: LayoutDashboard,
    roles: null,
  },
  {
    key: "dataset-list",
    href: "/portal/dataset",
    target: "portal-dataset-list",
    title: "Daftar dan template dataset",
    body: "Siapkan berkas dengan format yang benar: CSV, Excel, JSON, atau GeoJSON. Di bagian ini Anda dapat memeriksa status dataset dan mengunduh template. Template adalah format pengisian, bukan data yang otomatis dipublikasikan.",
    icon: Database,
    roles: [
      "super_admin",
      "data_admin",
      "admin_opd",
      "editor",
      "reviewer",
      "auditor",
      "viewer",
    ],
  },
  {
    key: "dataset-form",
    href: "/portal/dataset/new",
    target: "dataset-create-form",
    title: "Isi metadata dataset",
    body: "Isi judul, deskripsi, organisasi pengampu, sumber, cakupan wilayah, lisensi, frekuensi, dan periode. Draf belum tampil di portal publik. Anda dapat melihat formulir ini tanpa menyimpan data.",
    icon: FileSpreadsheet,
    roles: ["super_admin", "data_admin", "admin_opd", "editor"],
  },
  {
    key: "review",
    href: "/portal/review",
    target: "portal-review-list",
    title: "Pemeriksaan dan publikasi",
    body: "Hanya data yang disetujui dan berstatus terbit yang ditampilkan di portal publik. Gunakan halaman ini untuk memeriksa dataset yang diajukan, membaca statusnya, dan menjalankan tindakan yang tersedia bagi peran Anda sesuai alur persetujuan portal.",
    icon: ClipboardCheck,
    roles: ["super_admin", "data_admin", "admin_opd", "reviewer", "auditor"],
  },
  {
    key: "history",
    href: "/portal/riwayat",
    target: "portal-audit-history",
    title: "Riwayat perubahan",
    body: "Riwayat membantu Anda melihat siapa yang melakukan perubahan, kapan tindakan dilakukan, dan hasilnya. Informasi yang ditampilkan menyesuaikan akses akun Anda.",
    icon: History,
    roles: null,
  },
  {
    key: "organizations",
    href: "/portal/organisasi",
    target: "portal-organizations-list",
    title: "Organisasi pengampu",
    body: "Periksa daftar organisasi dan informasi kelembagaan. Perubahan organisasi hanya tersedia bagi pengguna yang memiliki akses pengelolaan.",
    icon: Building2,
    roles: ["super_admin", "data_admin", "auditor"],
  },
  {
    key: "users",
    href: "/portal/pengguna",
    target: "portal-users-access",
    title: "Pengguna dan akses",
    body: "Akses pengguna dan peran harus diberikan sesuai tugas serta lingkup organisasi. Berikan hak istimewa global hanya bila benar-benar diperlukan.",
    icon: Users,
    roles: ["super_admin", "data_admin", "auditor"],
  },
];

export function PortalOnboarding({ roleLabel, roles = [], completed }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tourRequested = searchParams.get("tour") === "1";
  const requestedStep = Number.parseInt(searchParams.get("step") || "0", 10);
  const steps = useMemo(
    () =>
      baseSteps.filter(
        (step) =>
          !step.roles || step.roles.some((role) => roles.includes(role)),
      ),
    [roles],
  );
  const [pending, startTransition] = useTransition();
  const finishLockRef = useRef(false);
  const [error, setError] = useState(false);
  const active = !completed || tourRequested;
  const stepIndex = Number.isInteger(requestedStep)
    ? Math.min(Math.max(requestedStep, 0), Math.max(steps.length - 1, 0))
    : 0;
  const current = steps[stepIndex] || steps[0];

  const targetIsOnCurrentPage = Boolean(
    active && current && pathname === current.href,
  );

  useEffect(() => {
    if (!targetIsOnCurrentPage || !current) return undefined;
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      document.getElementById(current.target)?.scrollIntoView({
        behavior: "auto",
        block: "center",
        inline: "nearest",
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [current, targetIsOnCurrentPage]);

  if (!active || !current || !steps.length) return null;

  function navigateToStep(index) {
    const next = steps[index];
    if (!next) return;
    setError(false);
    router.push(`${next.href}?tour=1&step=${index}#${next.target}`, {
      scroll: false,
    });
  }

  function finish() {
    if (finishLockRef.current || pending) return;
    finishLockRef.current = true;
    setError(false);
    startTransition(async () => {
      try {
        const result = await completeOnboardingAction();
        if (result?.success) {
          router.replace("/portal");
          router.refresh();
        } else {
          setError(true);
          finishLockRef.current = false;
        }
      } catch {
        setError(true);
        finishLockRef.current = false;
      }
    });
  }

  const Icon = current.icon || BookOpen;
  return (
    <aside
      data-tour-target={targetIsOnCurrentPage ? current.target : undefined}
      className="portal-tour-panel fixed inset-x-3 bottom-3 z-[110] mx-auto max-h-[min(58dvh,34rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_12px_44px_rgba(15,35,55,0.22)] sm:inset-x-6 sm:bottom-6"
      aria-labelledby="portal-tour-title"
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wide">
              Kenali fitur sesuai peran Anda · {roleLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Bagian {stepIndex + 1} dari {steps.length}
            </span>
          </div>
          <h2
            id="portal-tour-title"
            aria-live="polite"
            aria-atomic="true"
            className="mt-1 text-base font-semibold text-slate-900 sm:text-lg"
          >
            {current.title}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            {current.body}
          </p>
          {pathname !== current.href ? (
            <button
              type="button"
              onClick={() => navigateToStep(stepIndex)}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-800 underline underline-offset-4"
            >
              Buka bagian ini <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : null}
          {error ? (
            <p role="alert" className="mt-2 text-sm text-red-700">
              Status panduan belum tersimpan. Periksa koneksi lalu coba lagi.
            </p>
          ) : null}
          {pending ? (
            <p role="status" className="mt-2 text-sm text-slate-600">
              Menyimpan status panduan…
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={finish}
          disabled={pending}
          aria-busy={pending}
          aria-label={pending ? "Menyimpan status panduan" : "Akhiri panduan"}
          title={pending ? "Menyimpan status panduan" : "Akhiri panduan"}
          className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={finish}
          disabled={pending}
          aria-busy={pending}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          {pending ? "Menyimpan…" : "Lewati panduan"}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateToStep(Math.max(0, stepIndex - 1))}
            disabled={stepIndex === 0 || pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft size={15} aria-hidden="true" /> Sebelumnya
          </button>
          {stepIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => navigateToStep(stepIndex + 1)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Bagian berikutnya <ArrowRight size={15} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Menyimpan…" : "Selesai"}{" "}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
