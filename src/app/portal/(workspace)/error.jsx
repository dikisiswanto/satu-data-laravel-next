"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, RotateCw } from "lucide-react";
import { PendingActionButton } from "@/components/ui/pending-action-button";

export default function PortalError({ error, reset }) {
  const router = useRouter();
  const [retryPending, startRetry] = useTransition();
  useEffect(() => {
    console.error("portal_route_error", { digest: error?.digest || "unknown" });
  }, [error]);

  return (
    <section
      className="flex min-h-[65vh] flex-col items-start justify-center py-12"
      aria-labelledby="portal-error-title"
    >
      <span
        className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800"
        aria-hidden="true"
      >
        <AlertTriangle size={22} />
      </span>
      <p className="eyebrow mt-5">Ruang pengelola</p>
      <h1
        id="portal-error-title"
        className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        Halaman ini belum dapat dibuka
      </h1>
      <p role="alert" className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Halaman ini gagal dimuat. Gangguan pemuatan sementara tidak otomatis
        mengakhiri sesi Anda. Jika Anda baru saja menyimpan perubahan, periksa
        statusnya sebelum mengulangi tindakan tersebut. Coba lagi sebentar lagi.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <PendingActionButton
          onClick={() =>
            startRetry(() => {
              reset();
              router.refresh();
            })
          }
          pending={retryPending}
          pendingText="Mencoba lagi…"
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white"
        >
          <RotateCw size={16} aria-hidden="true" /> Coba lagi
        </PendingActionButton>
        <Link
          href="/portal"
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke ringkasan
        </Link>
      </div>
    </section>
  );
}
