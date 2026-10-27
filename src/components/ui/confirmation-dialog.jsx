"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info } from "lucide-react";

/**
 * Accessible, non-blocking replacement for the browser's confirm()/alert().
 * Keep actions behind an explicit choice and return focus to the opener.
 */
export function ConfirmationDialog({ dialog, onResolve }) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!dialog) return undefined;

    const previousActiveElement = document.activeElement;
    const focusable = [cancelRef.current, confirmRef.current].filter(Boolean);
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstFocusable?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onResolve(false);
        return;
      }
      if (event.key !== "Tab") return;
      if (focusable.length === 1) {
        event.preventDefault();
        firstFocusable.focus();
        return;
      }

      if (
        event.shiftKey &&
        (document.activeElement === firstFocusable ||
          !focusable.includes(document.activeElement))
      ) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === lastFocusable ||
          !focusable.includes(document.activeElement))
      ) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (
        previousActiveElement instanceof HTMLElement &&
        previousActiveElement.isConnected
      ) {
        previousActiveElement.focus();
      }
    };
  }, [dialog, onResolve]);

  if (!dialog || typeof document === "undefined") return null;

  const isAlert = dialog.type === "alert";
  const isDanger = dialog.variant === "danger";
  const confirmLabel =
    dialog.confirmLabel || (isAlert ? "Mengerti" : "Ya, lanjutkan");

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="presentation"
    >
      <section
        aria-describedby={dialog.description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-950/20 sm:p-6"
        role="alertdialog"
      >
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full ${isDanger ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
          >
            {isDanger ? <AlertTriangle size={20} /> : <Info size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold leading-6">
              {dialog.title || (isAlert ? "Informasi" : "Tinjau tindakan Anda")}
            </h2>
            {dialog.description ? (
              <p
                id={descriptionId}
                className="mt-2 text-sm leading-6 text-slate-600"
              >
                {dialog.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!isAlert ? (
            <button
              ref={cancelRef}
              type="button"
              onClick={() => onResolve(false)}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {dialog.cancelLabel || "Batal"}
            </button>
          ) : null}
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onResolve(true)}
            className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isDanger ? "bg-red-700 hover:bg-red-800 focus-visible:ring-red-700" : "bg-[#174f8b] hover:bg-[#123e6e] focus-visible:ring-blue-700"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
