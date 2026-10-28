import { getDatasetCategoryOptions } from "@/lib/dataset-options";
import { FieldGuidance } from "@/components/admin/form-field-guidance";
import { cn } from "@/lib/utils";

export function DatasetCategoryField({
  value = "",
  defaultValue,
  error,
  onChange,
  label = "Kategori dataset (opsional)",
  id = "category",
}) {
  const initialValue = defaultValue ?? value ?? "";
  const listId = `${id}-suggestions`;
  const errorId = `${id}-error`;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name="category"
        type="text"
        list={listId}
        maxLength={120}
        defaultValue={initialValue}
        placeholder="Pilih saran atau ketik kategori baru"
        className={cn(
          "field",
          error && "border-red-600 focus-visible:ring-red-600",
        )}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={`${id}-help${error ? ` ${errorId}` : ""}`}
        onChange={onChange}
      />
      <datalist id={listId}>
        {getDatasetCategoryOptions(initialValue).map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <FieldGuidance
        id={`${id}-help`}
        name="category"
        text="Pilih saran yang tersedia agar penamaan konsisten. Jika belum ada yang cocok, ketik kategori baru; gunakan ejaan yang sama untuk dataset sejenis."
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
