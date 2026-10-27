/**
 * Canonical dataset metadata options.
 * Values must remain identical to the update-frequency values accepted by the Laravel dataset API and stored by the database.
 * The stored value is machine-readable; only its display label belongs in UI.
 */
export const UPDATE_FREQUENCY_VALUES = Object.freeze([
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "irregular",
  "one_time",
]);

export const UPDATE_FREQUENCY_OPTIONS = Object.freeze([
  Object.freeze({ value: "daily", label: "Harian" }),
  Object.freeze({ value: "weekly", label: "Mingguan" }),
  Object.freeze({ value: "monthly", label: "Bulanan" }),
  Object.freeze({ value: "quarterly", label: "Triwulanan" }),
  Object.freeze({ value: "yearly", label: "Tahunan" }),
  Object.freeze({ value: "irregular", label: "Tidak teratur" }),
  Object.freeze({ value: "one_time", label: "Satu kali" }),
]);

export const UPDATE_FREQUENCY_LABELS = Object.freeze(
  Object.fromEntries(
    UPDATE_FREQUENCY_OPTIONS.map(({ value, label }) => [value, label]),
  ),
);

export function getUpdateFrequencyLabel(value) {
  if (!value) return "Belum tersedia";
  return UPDATE_FREQUENCY_LABELS[value] || String(value).replaceAll("_", " ");
}
