export function readSdiMetadataFormFields(raw) {
  const availableYearText = String(raw.sdi_available_year || "").trim();
  return {
    sds_registry_id: String(raw.sdi_sds_registry_id || "").trim() || null,
    reference_system_id:
      String(raw.sdi_reference_system_id || "").trim() || null,
    ddp_id: String(raw.sdi_ddp_id || "").trim(),
    ddp_name: String(raw.sdi_ddp_name || "").trim(),
    source_reference: String(raw.sdi_source_reference || "").trim(),
    available_year: availableYearText ? Number(availableYearText) : null,
    sds_code: String(raw.sdi_sds_code || "").trim(),
    sds_type: String(raw.sdi_sds_type || "").trim(),
    sds_version: String(raw.sdi_sds_version || "").trim(),
    standard_concept: String(raw.sdi_standard_concept || "").trim(),
    standard_definition: String(raw.sdi_standard_definition || "").trim(),
    measurement: String(raw.sdi_measurement || "").trim(),
    presentation_classification: String(
      raw.sdi_presentation_classification || "",
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    reference_code: String(raw.sdi_reference_code || "").trim(),
    reference_code_version: String(raw.sdi_reference_code_version || "").trim(),
    method_description: String(raw.sdi_method_description || "").trim(),
  };
}
