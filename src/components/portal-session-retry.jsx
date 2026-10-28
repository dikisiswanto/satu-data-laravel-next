"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

export function PortalSessionRetry({ retryAfterMs = 0 }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(Math.max(0, retryAfterMs) / 1000),
  );

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = window.setTimeout(
      () => setSecondsLeft((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <button
      type="button"
      disabled={pending || secondsLeft > 0}
      onClick={() => startTransition(() => router.refresh())}
      className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d7e2e9] bg-white px-3.5 py-2 text-sm font-semibold text-[#344e62] transition-colors hover:bg-[#f4f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5fa7] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
    >
      <RotateCw size={15} aria-hidden="true" />
      {pending
        ? "Memeriksa sesi…"
        : secondsLeft > 0
          ? `Coba lagi dalam ${secondsLeft} detik`
          : "Coba periksa lagi"}
    </button>
  );
}
