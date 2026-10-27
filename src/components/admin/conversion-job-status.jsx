"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { portalQueryKeys } from "@/lib/api/query-keys";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

const POLL_INTERVAL_MS = 6000;
const TERMINAL_STATUSES = new Set(["succeeded", "failed", "cancelled"]);

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} jam ${minutes} menit`;
  if (minutes > 0) return `${minutes} menit ${seconds} detik`;
  return `${seconds} detik`;
}

function getStatusPresentation(job) {
  if (job.status === "processing") {
    return {
      title: "Berkas sedang diproses",
      description:
        "Berkas sedang diperiksa dan diolah. Anda tidak perlu mengunggahnya lagi. Status di halaman ini akan diperbarui otomatis selama halaman tetap terbuka.",
      tone: "blue",
      icon: LoaderCircle,
      active: true,
    };
  }
  if (job.status === "queued" && job.safeErrorMessage) {
    return {
      title: "Pemrosesan akan dicoba kembali",
      description: `${job.safeErrorMessage} Berkas tetap tercatat dalam antrean. Kami akan memeriksa statusnya kembali secara otomatis.`,
      tone: "amber",
      icon: RefreshCw,
      active: true,
    };
  }
  if (job.status === "queued") {
    return {
      title: "Berkas diterima — menunggu giliran diproses",
      description:
        "Berkas sudah diterima dan masuk antrean. Proses akan dimulai saat layanan pemrosesan tersedia. Anda tidak perlu mengunggah berkas yang sama lagi.",
      tone: "blue",
      icon: Clock3,
      active: true,
    };
  }
  if (job.status === "succeeded") {
    return {
      title: "Pemrosesan selesai",
      description:
        "Berkas selesai diproses. Kami sedang memuat hasilnya dan akan memperbarui halaman secara otomatis.",
      tone: "green",
      icon: CheckCircle2,
      active: false,
    };
  }
  if (job.status === "cancelled") {
    return {
      title: "Pemrosesan dibatalkan",
      description:
        "Pemrosesan ini sudah dibatalkan. Muat ulang halaman untuk melihat status terakhir dan langkah berikutnya.",
      tone: "amber",
      icon: AlertCircle,
      active: false,
    };
  }
  return {
    title: "Pemrosesan belum berhasil",
    description:
      job.safeErrorMessage ||
      "Berkas belum berhasil diproses. Baca rincian penyebab di halaman ini terlebih dahulu sebelum mencoba lagi.",
    tone: "red",
    icon: AlertCircle,
    active: false,
  };
}

const toneClasses = {
  blue: "border-blue-200 bg-blue-50 text-blue-950",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  green: "border-emerald-200 bg-emerald-50 text-emerald-950",
  red: "border-red-200 bg-red-50 text-red-950",
};

export function ConversionJobStatus({ datasetId, version, initialJob }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Nilai awal harus deterministik saat render dan hidrasi.
  const [now, setNow] = useState(0);
  // Gunakan timestamp pekerjaan dari server. Jika tak tersedia, 0 membuat
  // data dianggap usang sehingga React Query segera memeriksa status terbaru.
  const initialDataUpdatedAt =
    parseDate(initialJob?.updated_at ?? initialJob?.created_at)?.getTime() ?? 0;
  const refreshStarted = useRef(false);
  const previousStatus = useRef(initialJob?.status || null);

  const statusQuery = useQuery({
    queryKey: portalQueryKeys.conversionStatus(datasetId, version),
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/v1/portal/datasets/${encodeURIComponent(datasetId)}/conversion-status?version=${encodeURIComponent(version)}`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal,
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(payload?.error || `conversion_status_http_${response.status}`);
        error.status = response.status;
        throw error;
      }
      if (!payload || !Object.hasOwn(payload, "job")) {
        const error = new Error("conversion_status_invalid_response");
        error.code = error.message;
        throw error;
      }
      return payload.job;
    },
    initialData: initialJob ?? undefined,
    initialDataUpdatedAt,
    staleTime: 5_000,
    refetchInterval: (query) =>
      query.state.data && TERMINAL_STATUSES.has(query.state.data.status)
        ? false
        : POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: (query) =>
      !query.state.data || !TERMINAL_STATUSES.has(query.state.data.status),
    retry: (failureCount, error) => {
      if ([400, 401, 403, 404, 409, 422].includes(Number(error?.status || 0))) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const job = statusQuery.data ?? null;
  const statusErrorCode = Number(statusQuery.error?.status || 0);
  const connectionState = statusQuery.isError
    ? [401, 403, 404].includes(statusErrorCode)
      ? "unavailable"
      : "retrying"
    : "connected";
  const lastCheckedAt = statusQuery.dataUpdatedAt || null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentStatus = statusQuery.data?.status || null;
    const wasTerminal = previousStatus.current && TERMINAL_STATUSES.has(previousStatus.current);
    const isTerminal = currentStatus && TERMINAL_STATUSES.has(currentStatus);
    if (currentStatus && isTerminal && !wasTerminal && !refreshStarted.current) {
      refreshStarted.current = true;
      // Invalidate cached detail/list state, then refresh the Server Component
      // that owns the full dataset resource and validation presentation.
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: portalQueryKeys.dataset(datasetId) }),
        queryClient.invalidateQueries({ queryKey: portalQueryKeys.datasets() }),
      ]);
      const timer = window.setTimeout(() => router.refresh(), 900);
      previousStatus.current = currentStatus;
      return () => window.clearTimeout(timer);
    }
    if (currentStatus) previousStatus.current = currentStatus;
    return undefined;
  }, [statusQuery.data?.status, router, queryClient, datasetId]);

  if (!job) return null;
  const presentation = getStatusPresentation(job);
  const leaseExpiry = parseDate(job.leaseExpiresAt);
  const leaseExpired =
    job.status === "processing" &&
    leaseExpiry !== null &&
    leaseExpiry.getTime() < now;
  if (leaseExpired) {
    presentation.title = "Pemrosesan belum mengirim pembaruan status";
    presentation.description =
      "Status pemrosesan belum diperbarui dalam beberapa waktu. Berkas tetap tercatat dan dapat diproses kembali oleh sistem. Anda tidak perlu mengunggah ulang. Jika status tidak berubah, hubungi administrator portal.";
    presentation.tone = "amber";
    presentation.icon = RefreshCw;
    presentation.active = false;
  }
  const StatusIcon = presentation.icon;
  const clockStart = parseDate(
    job.status === "processing"
      ? job.startedAt || job.createdAt
      : job.createdAt,
  );
  const elapsed = clockStart
    ? formatDuration(now - clockStart.getTime())
    : null;

  return (
    <section
      className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${toneClasses[presentation.tone]}`}
    >
      <div className="flex items-start gap-3">
        <StatusIcon
          size={20}
          aria-hidden="true"
          className={`mt-0.5 shrink-0 ${presentation.active && job.status === "processing" ? "motion-safe:animate-spin" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <div aria-live="polite" aria-atomic="true">
            <p className="font-semibold">{presentation.title}</p>
            <p className="mt-1">{presentation.description}</p>
          </div>
          {presentation.active ? (
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80"
              role="progressbar"
              aria-label="Pemrosesan sedang berlangsung"
              aria-valuetext="Progres persentase tidak tersedia; status diperiksa otomatis"
            >
              <div className="h-full w-1/3 rounded-full bg-blue-600 motion-safe:animate-pulse" />
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
            {elapsed ? <span>Waktu berjalan: {elapsed}</span> : null}
            {job.attempts > 0 ? (
              <span>
                Upaya pemrosesan {job.attempts} dari {job.maxAttempts || 5}
              </span>
            ) : null}
            {!TERMINAL_STATUSES.has(job.status) ? (
              <span>Status diperiksa otomatis setiap 6 detik</span>
            ) : null}
          </div>
          {connectionState !== "connected" ? (
            <p className="mt-2 text-xs font-medium" role="status">
              {connectionState === "unavailable"
                ? "Kami belum dapat memeriksa status dengan akun ini. Muat ulang halaman; jika masalah tetap muncul, hubungi administrator portal."
                : "Koneksi sedang terganggu. Kami akan mencoba memeriksa status lagi secara otomatis. Untuk menghindari berkas ganda, tunggu hasil pemeriksaan ini sebelum mengunggah ulang."}
            </p>
          ) : lastCheckedAt ? (
            <p className="mt-1 text-xs opacity-70">
              Status diperiksa{" "}
              {new Date(lastCheckedAt).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
