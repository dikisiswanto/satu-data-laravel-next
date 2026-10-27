import { z } from "zod";

export const sdiMetadataSchema = z.object({
  sds_registry_id: z.string().uuid().nullable().optional().default(null),
  reference_system_id: z.string().uuid().nullable().optional().default(null),
  ddp_id: z.string().trim().max(160).optional().default(""),
  ddp_name: z.string().trim().max(240).optional().default(""),
  source_reference: z.string().trim().max(2048).optional().default(""),
  available_year: z
    .number()
    .int()
    .min(1900)
    .max(2200)
    .nullable()
    .optional()
    .default(null),
  sds_code: z.string().trim().max(160).optional().default(""),
  sds_type: z.string().trim().max(120).optional().default(""),
  sds_version: z.string().trim().max(80).optional().default(""),
  standard_concept: z.string().trim().max(1000).optional().default(""),
  standard_definition: z.string().trim().max(5000).optional().default(""),
  measurement: z.string().trim().max(160).optional().default(""),
  presentation_classification: z
    .array(z.string().trim().min(1).max(160))
    .max(100)
    .optional()
    .default([]),
  reference_code: z.string().trim().max(160).optional().default(""),
  reference_code_version: z.string().trim().max(80).optional().default(""),
  method_description: z.string().trim().max(10000).optional().default(""),
});
