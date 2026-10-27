"use client";

import { useId, useState } from "react";
import { PendingActionButton } from "@/components/ui/pending-action-button";

/** Inline, keyboard-accessible reason capture for returning a record for revision. */
export function ReturnForChangesForm({
  onSubmit,
  onCancel,
  pending = false,
  disabled = false,
  pendingText = "Mengirim catatan…",
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const unavailable = pending || disabled;

  function submit(event) {
    event.preventDefault();
    if (unavailable) return;
    const normalized = reason.trim();
    if (normalized.length < 5) {
      setError(
        "Catatan perbaikan minimal 5 karakter agar dapat ditindaklanjuti.",
      );
      return;
    }
    setError("");
    onSubmit(normalized);
  }

  return (
    <form
      onSubmit={submit}
      aria-busy={pending}
      className="basis-full rounded-xl border border-line bg-surface p-3 sm:p-4"
    >
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        Catatan perbaikan
      </label>
      <p id={`${id}-help`} className="mt-1 text-xs leading-5 text-muted">
        Jelaskan bagian yang perlu diperbaiki dan informasi yang harus
        dilengkapi (minimal 5 karakter). Catatan akan terlihat oleh pengelola
        dataset.
      </p>
      <textarea
        id={id}
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
          if (error) setError("");
        }}
        minLength={5}
        maxLength={2000}
        required
        disabled={unavailable}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-help ${id}-error` : `${id}-help`}
        className="field mt-3 min-h-24"
        placeholder="Contoh: Sebutkan sumber angka yang digunakan dan sesuaikan periode data dengan dokumen resmi."
      />
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-xs leading-5 text-red-700"
        >
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <PendingActionButton
          type="submit"
          pending={pending}
          pendingText={pendingText}
          disabled={disabled || reason.trim().length < 5}
          className="rounded-control bg-primary px-3 py-2 text-sm font-semibold text-white"
        >
          Kirim untuk perbaikan
        </PendingActionButton>
        <button
          type="button"
          disabled={unavailable}
          onClick={onCancel}
          className="min-h-10 rounded-control border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
