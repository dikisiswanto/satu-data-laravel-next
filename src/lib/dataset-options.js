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

/**
 * Reusable category suggestions keep metadata values consistent without
 * blocking an agency from introducing a new, valid category.
 * Set NEXT_PUBLIC_DATASET_CATEGORIES as pipe-separated labels per deployment.
 */
export const DEFAULT_DATASET_CATEGORIES = Object.freeze([
  "Administrasi Pemerintahan",
  "Demografi dan Kependudukan",
  "Ekonomi dan Keuangan",
  "Pendidikan",
  "Kesehatan",
  "Sosial dan Kesejahteraan",
  "Pertanian dan Pangan",
  "Perikanan dan Kelautan",
  "Infrastruktur dan Perhubungan",
  "Lingkungan Hidup",
  "Geospasial",
  "Pariwisata dan Kebudayaan",
  "Ketenagakerjaan",
  "Statistik Wilayah",
]);

const configuredCategories = (process.env.NEXT_PUBLIC_DATASET_CATEGORIES || "")
  .split("|")
  .map((category) => category.trim())
  .filter(Boolean)
  .filter(
    (category, index, all) =>
      all.findIndex(
        (item) =>
          item.toLocaleLowerCase("id-ID") ===
          category.toLocaleLowerCase("id-ID"),
      ) === index,
  );

export const DATASET_CATEGORY_OPTIONS = Object.freeze(
  configuredCategories.length
    ? configuredCategories
    : [...DEFAULT_DATASET_CATEGORIES],
);

const normalizeCategoryKey = (value) =>
  String(value || "")
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase("id-ID");

export function getDatasetCategoryOptions(currentValue = "") {
  const current = String(currentValue || "").trim();
  const unique = new Map();

  // Preserve the configured label as the canonical suggestion when an existing
  // dataset uses only a case/Unicode variant of the same category.
  for (const category of [
    ...DATASET_CATEGORY_OPTIONS,
    ...(current ? [current] : []),
  ]) {
    const key = normalizeCategoryKey(category);
    if (key && !unique.has(key)) unique.set(key, category);
  }

  return [...unique.values()].sort((left, right) =>
    left.localeCompare(right, "id-ID", { sensitivity: "base" }),
  );
}
