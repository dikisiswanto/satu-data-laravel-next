"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

let toastSequence = 0;

export function PortalToastProvider() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const receive = (event) => {
      const detail = event.detail;
      if (
        !detail ||
        typeof detail.message !== "string" ||
        !detail.message.trim()
      )
        return;
      const id = ++toastSequence;
      const toast = {
        id,
        type: detail.type === "success" ? "success" : "error",
        message: detail.message.trim(),
      };
      setToasts((current) => [...current, toast].slice(-4));
      const timer = window.setTimeout(
        () => dismiss(id),
        Number.isFinite(detail.duration) ? detail.duration : 4500,
      );
      timers.current.set(id, timer);
    };
    window.addEventListener("portal:toast", receive);
    return () => {
      window.removeEventListener("portal:toast", receive);
      for (const timer of timers.current.values()) window.clearTimeout(timer);
      timers.current.clear();
    };
  }, [dismiss]);

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 sm:right-6 sm:top-6"
      aria-label="Pemberitahuan portal"
    >
      {toasts.map((toast) => {
        const success = toast.type === "success";
        const Icon = success ? CheckCircle2 : CircleAlert;
        return (
          <div
            key={toast.id}
            role={success ? "status" : "alert"}
            aria-live={success ? "polite" : "assertive"}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-[0_12px_40px_rgb(15_35_55_/_0.18)] ring-1 ring-black/[0.03] ${success ? "border-emerald-200" : "border-rose-200"}`}
          >
            <Icon
              size={20}
              className={`mt-0.5 shrink-0 ${success ? "text-emerald-700" : "text-rose-700"}`}
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 text-sm font-medium leading-5 text-slate-800">
              {toast.message}
            </p>
            <button
              type="button"
              className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700"
              aria-label="Tutup pemberitahuan"
              onClick={() => dismiss(toast.id)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
