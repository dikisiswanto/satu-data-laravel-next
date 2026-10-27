import { isHttpUrl } from "./url.js";
import { z } from "zod";
import { UPDATE_FREQUENCY_VALUES } from "../dataset-options.js";

export const updateFrequencySchema = z.enum(UPDATE_FREQUENCY_VALUES);
export const datasetMetadataSchema = z
  .object({
    title: z.string().trim().min(5).max(180),
    description: z.string().trim().min(20).max(5000),
    organization_id: z.string().uuid(),
    category: z.string().trim().max(120).optional().or(z.literal("")),
    keywords: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    reference_period_start: z.string().date().optional().or(z.literal("")),
    reference_period_end: z.string().date().optional().or(z.literal("")),
    geographic_scope: z.string().trim().min(2).max(240),
    update_frequency: updateFrequencySchema,
    source_name: z.string().trim().min(2).max(240),
    source_url: z
      .string()
      .trim()
      .url()
      .max(2048)
      .refine(isHttpUrl, "Gunakan URL HTTP atau HTTPS.")
      .optional()
      .or(z.literal("")),
    methodology: z.string().trim().max(10000).optional().or(z.literal("")),
    unit: z.string().trim().max(100).optional().or(z.literal("")),
    license_text: z.string().trim().min(2).max(240),
  })
  .superRefine((data, ctx) => {
    if (
      data.reference_period_start &&
      data.reference_period_end &&
      data.reference_period_end < data.reference_period_start
    )
      ctx.addIssue({
        code: "custom",
        path: ["reference_period_end"],
        message: "Akhir periode harus setelah atau sama dengan awal periode.",
      });
  });
export const resourceUploadSchema = z.object({
  datasetId: z.string().uuid(),
  organizationId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
  format: z.enum(["csv", "xlsx", "json", "geojson", "pdf"]),
});
export function detectInputFormat(filename, mimeType) {
  const ext = filename.toLowerCase().split(".").pop();
  if (
    ext === "csv" &&
    [
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "text/plain",
      "",
    ].includes(mimeType)
  )
    return "csv";
  if (
    ext === "xlsx" &&
    [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
      "",
    ].includes(mimeType)
  )
    return "xlsx";
  if (
    ext === "json" &&
    ["application/json", "text/json", "text/plain", ""].includes(mimeType)
  )
    return "json";
  if (
    ext === "geojson" &&
    ["application/geo+json", "application/json", "text/plain", ""].includes(
      mimeType,
    )
  )
    return "geojson";
  return null;
}
