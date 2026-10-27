"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueryKeys } from "@/lib/api/query-keys";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";
import { scrollToPublicList } from "@/lib/public-scroll";

const PAGE_SIZE = 10;

export function DatasetResourcePreview({ slug, resource }) {
  const [page, setPage] = useState(1);
  const previewSectionRef = useRef(null);
  const changePage = (nextPage) => {
    setPage(nextPage);
    window.requestAnimationFrame(() =>
      scrollToPublicList(previewSectionRef.current),
    );
  };
  const endpoint = `/api/v1/datasets/${encodeURIComponent(slug)}/resources/${encodeURIComponent(resource.id)}/rows`;
  const apiUrl = `${endpoint}?page=1&limit=${PAGE_SIZE}`;
  const previewQuery = useQuery({
    queryKey: publicQueryKeys.resourceRows(slug, resource.id, page, PAGE_SIZE),
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `${endpoint}?page=${page}&limit=${PAGE_SIZE}`,
        {
          cache: "no-store",
          signal,
          headers: { Accept: "application/json" },
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(
          payload?.error || `preview_http_${response.status}`,
        );
        error.status = response.status;
        throw error;
      }
      if (!payload || !Array.isArray(payload.data) || !payload.meta) {
        throw new Error("preview_invalid_response");
      }
      return payload;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (
        [400, 401, 403, 404, 409, 422, 429].includes(Number(error?.status || 0))
      )
        return false;
      return failureCount < 1;
    },
  });
  const result = previewQuery.data || null;
  const state = previewQuery.isPending
    ? "loading"
    : previewQuery.isError
      ? "error"
      : "ready";
  const rawColumns = result?.meta?.columns || resource.column_schema || [];
  const safeRawColumns = Array.isArray(rawColumns) ? rawColumns : [];
  // Converter versions may serialize headers as plain strings; older data used
  // objects with `name` or `key`. Normalize once so rendering stays stable.
  const columns = safeRawColumns.map((column, index) => {
    const name =
      typeof column === "string"
        ? column
        : String(column?.name ?? column?.key ?? `Kolom ${index + 1}`);
    return { name };
  });
  const rows = result?.data || [];
  const totalPages = result?.meta?.total_pages || 1;

  return (
    <section
      ref={previewSectionRef}
      className="mt-6 scroll-mt-24 rounded-card border bg-surface p-4 sm:p-5"
      aria-labelledby={`preview-${resource.id}`}
      aria-busy={state === "loading"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`preview-${resource.id}`} className="text-base font-semibold">
            Pratinjau data tabel
          </h3>
          <p className="mt-1 text-sm text-muted">
            Menampilkan {PAGE_SIZE} baris per halaman. Pratinjau dibatasi hingga
            100.000 baris; data lengkap tersedia melalui berkas unduhan.
          </p>
        </div>
        <a
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-4"
          href={apiUrl}
          target="_blank"
          rel="noreferrer"
        >
          Endpoint API <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      {state === "loading" ? (
        <p
          className="mt-4 flex items-center gap-2 text-sm text-muted"
          role="status"
        >
          <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />{" "}
          Memuat pratinjau data…
        </p>
      ) : state === "error" ? (
        <div
          className="mt-4 rounded-control border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          role="alert"
        >
          Pratinjau belum dapat dimuat. Berkas unduhan tetap tersedia.{" "}
          <button
            type="button"
            className="ml-1 font-semibold underline underline-offset-4"
            onClick={() => previewQuery.refetch()}
          >
            Coba lagi
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Belum ada baris yang dapat ditampilkan.
        </p>
      ) : (
        <>
          <p className="public-table-scroll-hint mt-3 text-xs text-muted sm:hidden">
            Geser tabel ke samping untuk melihat kolom lainnya.
          </p>
          <div
            className="public-table-scroll-region mt-2 overflow-x-auto rounded-control border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            role="region"
            aria-label={`Tabel pratinjau ${resource.original_filename}`}
            tabIndex={0}
          >
            <table className="w-full min-w-max border-collapse text-left text-sm">
              <caption className="sr-only">
                Pratinjau {resource.original_filename}, halaman {page}
              </caption>
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th
                    scope="col"
                    className="whitespace-nowrap border-b px-3 py-2.5"
                  >
                    No.
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.name}
                      scope="col"
                      className="max-w-64 whitespace-nowrap border-b px-3 py-2.5"
                    >
                      {column.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.row_number} className="even:bg-slate-50/60">
                    <td className="border-b px-3 py-2 tabular-nums text-muted">
                      {row.row_number}
                    </td>
                    {columns.map((column, columnIndex) => {
                      // Canonical Laravel response uses { row_number, row }.
                      // Accept the former `values` shape during the frontend transition.
                      const rowData = row.row ?? row.values ?? row;
                      const value = Array.isArray(rowData)
                        ? rowData[columnIndex]
                        : rowData?.[column.name];
                      const display =
                        value === null || value === undefined
                          ? "—"
                          : typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value);
                      return (
                        <td
                          key={column.name}
                          className="max-w-64 border-b px-3 py-2 align-top"
                        >
                          <span
                            className="line-clamp-2 break-words"
                            title={display}
                          >
                            {display}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted" aria-live="polite" aria-atomic="true">
              Halaman {page} dari {totalPages} ·{" "}
              {Number(result?.meta?.total || 0).toLocaleString("id-ID")} baris
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={page <= 1 || state === "loading"}
                className="inline-flex h-9 items-center gap-1 rounded-control border bg-white px-3 font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={15} aria-hidden="true" /> Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => changePage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || state === "loading"}
                className="inline-flex h-9 items-center gap-1 rounded-control border bg-white px-3 font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
