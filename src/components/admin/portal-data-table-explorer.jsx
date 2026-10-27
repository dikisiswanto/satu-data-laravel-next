"use client";

import { useId, useMemo, useState } from "react";
import { ListFilter, Search, X } from "lucide-react";
import { DatePicker } from "@/components/admin/date-picker";

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .trim();
}

export function PortalDataTableExplorer({
  caption,
  headers,
  rowNodes,
  rowMeta,
  emptyTitle = "Tidak ada data yang cocok",
  emptyDescription = "Ubah kata kunci atau hapus satu atau beberapa filter, lalu coba lagi.",
  searchPlaceholder = "Cari berdasarkan isi kolom…",
  dateFilterLabel = "Tanggal",
  alwaysShowFilters = [],
  filterLabelOverrides = {},
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const filterDefinitions = useMemo(() => {
    const seen = new Map();
    for (const meta of rowMeta) {
      for (const [key, option] of Object.entries(meta.filters || {})) {
        if (!option?.value) continue;
        if (!seen.has(key)) seen.set(key, new Map());
        seen.get(key).set(option.value, option.label || option.value);
      }
    }
    const keys = new Set([...seen.keys(), ...alwaysShowFilters]);
    return [...keys]
      .map((key) => {
        const values = seen.get(key) || new Map();
        return {
          key,
          label:
            rowMeta.find((meta) => meta.filterLabels?.[key])?.filterLabels?.[
              key
            ] ||
            filterLabelOverrides[key] ||
            key,
          options: [...values.entries()]
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label, "id")),
        };
      })
      .filter(
        (definition) =>
          (alwaysShowFilters.includes(definition.key) ||
            definition.options.length > 1) &&
          definition.options.length <= 30,
      );
  }, [rowMeta, alwaysShowFilters, filterLabelOverrides]);
  const hasDates = rowMeta.some((meta) => meta.dateValue);
  const activeFilterCount =
    Number(Boolean(query.trim())) +
    Object.values(filters).filter(Boolean).length +
    Number(Boolean(dateFrom)) +
    Number(Boolean(dateTo));
  const filteredIndices = useMemo(() => {
    const normalizedQuery = normalize(query);
    return rowMeta.flatMap((meta, index) => {
      if (
        normalizedQuery &&
        !normalize(meta.searchText).includes(normalizedQuery)
      )
        return [];
      for (const [key, value] of Object.entries(filters)) {
        if (value && meta.filters?.[key]?.value !== value) return [];
      }
      if (dateFrom && (!meta.dateValue || meta.dateValue < dateFrom)) return [];
      if (dateTo && (!meta.dateValue || meta.dateValue > dateTo)) return [];
      return [index];
    });
  }, [rowMeta, query, filters, dateFrom, dateTo]);
  const clearFilters = () => {
    setQuery("");
    setFilters({});
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="portal-table-explorer">
      <div
        className="portal-filter-form portal-table-explorer-toolbar"
        role="group"
        aria-label="Pencarian dan filter tabel"
      >
        <div className="portal-filter-search">
          <label className="portal-field-label" htmlFor={`${id}-search`}>
            Cari data
          </label>
          <div className="relative">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              className="field pl-9"
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
            />
          </div>
        </div>
        {filterDefinitions.map((definition) => (
          <div className="portal-table-filter" key={definition.key}>
            <label
              className="portal-field-label"
              htmlFor={`${id}-${definition.key}`}
            >
              {definition.label}
            </label>
            <select
              className="field"
              id={`${id}-${definition.key}`}
              value={filters[definition.key] || ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  [definition.key]: event.target.value,
                }))
              }
            >
              <option value="">Semua</option>
              {definition.options.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        {hasDates ? (
          <>
            <div className="portal-table-filter portal-table-date-filter">
              <label className="portal-field-label" htmlFor={`${id}-from`}>
                {dateFilterLabel} dari
              </label>
              <DatePicker
                id={`${id}-from`}
                placeholder="Pilih tanggal awal"
                value={dateFrom}
                max={dateTo || undefined}
                onValueChange={setDateFrom}
              />
            </div>
            <div className="portal-table-filter portal-table-date-filter">
              <label className="portal-field-label" htmlFor={`${id}-to`}>
                {dateFilterLabel} sampai
              </label>
              <DatePicker
                id={`${id}-to`}
                placeholder="Pilih tanggal akhir"
                value={dateTo}
                min={dateFrom || undefined}
                onValueChange={setDateTo}
              />
            </div>
          </>
        ) : null}
        <div className="portal-filter-actions">
          <button
            className="portal-reset-link inline-flex items-center gap-1.5"
            type="button"
            onClick={clearFilters}
          >
            <X size={14} aria-hidden="true" /> Reset filter
          </button>
        </div>
      </div>
      <div
        className="portal-table-explorer-summary"
        aria-live="polite"
        aria-atomic="true"
      >
        <span>
          <ListFilter size={14} aria-hidden="true" /> Menampilkan{" "}
          <strong>{filteredIndices.length.toLocaleString("id-ID")}</strong> dari{" "}
          {rowNodes.length.toLocaleString("id-ID")} baris yang dimuat
        </span>
        {rowNodes.length >= 500 ? (
          <span className="portal-table-cap-note">
            Daftar dibatasi maksimal 500 baris terbaru.
          </span>
        ) : null}
      </div>
      {filteredIndices.length ? (
        <>
          <p className="portal-table-mobile-hint sm:hidden">
            Geser tabel ke samping untuk melihat kolom lainnya.
          </p>
          <div
            className="portal-table-wrap"
            role="region"
            aria-label={caption || "Tabel data portal"}
            tabIndex={0}
          >
            <table className="portal-data-table">
              {caption ? (
                <caption className="sr-only">{caption}</caption>
              ) : null}
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header.key}
                      scope="col"
                      className={header.className || ""}
                    >
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{filteredIndices.map((index) => rowNodes[index])}</tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="portal-table-filter-empty" role="status">
          <span className="portal-empty-icon">
            <Search size={19} aria-hidden="true" />
          </span>
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              className="portal-reset-link inline-flex items-center gap-1.5"
              onClick={clearFilters}
            >
              <X size={14} aria-hidden="true" /> Hapus semua filter
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
