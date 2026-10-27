export const SDI_METADATA_FIELDS = [
  { key: "ddp_id", label: "ID DDP" },
  { key: "ddp_name", label: "Nama DDP" },
  { key: "source_reference", label: "Sumber Referensi" },
  { key: "available_year", label: "Tahun Tersedia" },
  { key: "sds_code", label: "Kode SDS" },
  { key: "sds_type", label: "Type SDS" },
  { key: "sds_version", label: "Versi SDS" },
  { key: "standard_concept", label: "Konsep" },
  { key: "standard_definition", label: "Definisi" },
  { key: "measurement", label: "Ukuran" },
  { key: "presentation_classification", label: "Klasifikasi Penyajian" },
  { key: "reference_code", label: "Kode Referensi" },
  { key: "reference_code_version", label: "Versi Kode Referensi" },
  { key: "method_description", label: "Metode" },
];

const HARVEST_REQUIRED_FIELDS = [
  "ddp_id",
  "ddp_name",
  "available_year",
  "sds_code",
  "sds_type",
  "sds_version",
  "standard_definition",
  "measurement",
  "presentation_classification",
];

const textValue = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Only processed, public, non-source distributions from the active version
 * qualify for an SDI export profile. Source uploads are internal working files
 * and must never make a dataset appear export-ready.
 */
export function getSdiExportResources(resources = [], currentVersion) {
  if (!Array.isArray(resources)) return [];
  return resources.filter((resource) =>
    resource &&
    ![true, 1, "1"].includes(resource.is_source) &&
    [true, 1, "1"].includes(resource.is_public) &&
    resource.conversion_status === "succeeded" &&
    Number(resource.dataset_version) === Number(currentVersion),
  );
}

/**
 * Technical readiness for the local harvest profile. This is not a claim that
 * a target SPLP/SDI connector has accepted the record; that needs an integration test.
 */
export function getSdiMetadataGaps(
  dataset,
  metadata,
  resources = [],
  options = {},
) {
  const gaps = [];
  const sdi = metadata || {};
  const organization = dataset?.organizations || dataset?.organization || {};

  if (!textValue(dataset?.title)) gaps.push("Nama Data");
  if (!textValue(organization?.code)) gaps.push("Kode Instansi");
  if (!textValue(organization?.name)) gaps.push("Nama Instansi");
  for (const key of HARVEST_REQUIRED_FIELDS) {
    const value = sdi[key];
    const present =
      key === "available_year"
        ? Number.isInteger(value) && value >= 1900 && value <= 2200
        : key === "presentation_classification"
          ? Array.isArray(value) && value.some((item) => textValue(item))
          : Boolean(textValue(value));
    if (!present) {
      gaps.push(
        SDI_METADATA_FIELDS.find((field) => field.key === key)?.label || key,
      );
    }
  }
  if (!textValue(sdi.source_reference) && !textValue(dataset?.source_url)) {
    gaps.push("Sumber Referensi");
  }
  if (!textValue(dataset?.unit)) gaps.push("Satuan");
  if (!textValue(sdi.method_description) && !textValue(dataset?.methodology)) {
    gaps.push("Metode");
  }
  if (
    !textValue(sdi.reference_code) ||
    !textValue(sdi.reference_code_version)
  ) {
    gaps.push("Kode Referensi dan Versi Kode Referensi");
  }
  if (!Array.isArray(resources) || resources.length === 0) {
    gaps.push("Distribusi berkas versi aktif yang berhasil diproses");
  }
  if (options.requireVerifiedRegistries) {
    const standard = sdi.sdi_standard_registry;
    const referenceSystem = sdi.reference_code_systems;
    const today = options.today || new Date().toISOString().slice(0, 10);
    const isActiveVerified = (record) =>
      record?.status === "verified" &&
      (!record.valid_from || record.valid_from <= today) &&
      (!record.valid_until || record.valid_until >= today);
    if (!sdi.sds_registry_id || !isActiveVerified(standard)) {
      gaps.push("Tautan ke standar terverifikasi yang masih berlaku");
    } else {
      if (
        textValue(sdi.sds_code) !== textValue(standard.standard_code) ||
        textValue(sdi.sds_version) !== textValue(standard.version_label)
      ) {
        gaps.push(
          "Kode dan versi SDS harus sama dengan entri registri yang ditautkan",
        );
      }
      if (
        textValue(sdi.standard_concept) !== textValue(standard.title) ||
        textValue(sdi.standard_definition) !== textValue(standard.definition)
      ) {
        gaps.push(
          "Konsep dan definisi harus sama dengan entri standar yang ditautkan",
        );
      }
    }
    if (!sdi.reference_system_id || !isActiveVerified(referenceSystem)) {
      gaps.push(
        "Tautan ke sistem kode referensi terverifikasi yang masih berlaku",
      );
    } else if (
      textValue(sdi.reference_code) !==
        textValue(referenceSystem.system_code) ||
      textValue(sdi.reference_code_version) !==
        textValue(referenceSystem.version_label)
    ) {
      gaps.push(
        "Kode dan versi referensi harus sama dengan sistem yang ditautkan",
      );
    }
  }
  return [...new Set(gaps)];
}

export function isSdiMetadataReady(
  dataset,
  metadata,
  resources = [],
  options = {},
) {
  return getSdiMetadataGaps(dataset, metadata, resources, options).length === 0;
}

export function toSdiHarvestRecord(dataset, metadata, resources, origin) {
  const sdi = metadata || {};
  const organization = dataset.organizations || dataset.organization || {};
  const sourceReference =
    textValue(sdi.source_reference) || textValue(dataset.source_url);
  const method =
    textValue(sdi.method_description) || textValue(dataset.methodology);
  return {
    "Nama Data": dataset.title,
    "Kode Instansi": organization.code,
    "Nama Instansi": organization.name,
    "ID DDP": sdi.ddp_id,
    "Nama DDP": sdi.ddp_name,
    "Sumber Referensi": sourceReference,
    "Tahun Tersedia": sdi.available_year,
    "Kode SDS": sdi.sds_code,
    "Type SDS": sdi.sds_type,
    "Versi SDS": sdi.sds_version,
    Konsep: sdi.standard_concept || "",
    Definisi: sdi.standard_definition,
    Ukuran: sdi.measurement,
    Satuan: dataset.unit,
    "Klasifikasi Penyajian": (Array.isArray(sdi.presentation_classification)
      ? sdi.presentation_classification
      : []
    ).join("; "),
    "Kode Referensi": sdi.reference_code,
    "Versi Kode Referensi": sdi.reference_code_version,
    Metode: method,
    "ID Dataset Daerah": dataset.id,
    "Slug Dataset": dataset.slug,
    "Versi Dataset": dataset.current_version,
    "URL Dataset": `${origin}/dataset/${encodeURIComponent(dataset.slug)}`,
    "URL Metadata API": `${origin}/api/v1/datasets/${encodeURIComponent(dataset.slug)}`,
    Distribusi: resources.map((resource) => ({
      id: resource.id,
      format: resource.format,
      media_type: resource.mime_type,
      size_bytes: resource.size_bytes,
      checksum_sha256: resource.checksum_sha256 || null,
      download_url: `${origin}/api/v1/datasets/${encodeURIComponent(dataset.slug)}/resources/${encodeURIComponent(resource.id)}`,
      modified: resource.created_at,
    })),
    "Tanggal Modifikasi": dataset.updated_at,
  };
}

const DCAT_FREQUENCY_URI = {
  daily: "http://purl.org/cld/freq/daily",
  weekly: "http://purl.org/cld/freq/weekly",
  monthly: "http://purl.org/cld/freq/monthly",
  quarterly: "http://purl.org/cld/freq/quarterly",
  yearly: "http://purl.org/cld/freq/annual",
  irregular: "http://purl.org/cld/freq/irregular",
};

const formatByType = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  json: "application/json",
  geojson: "application/geo+json",
  pdf: "application/pdf",
  xml: "application/xml",
  original: "application/octet-stream",
  other: "application/octet-stream",
};

export function toDcatCatalog(
  datasets,
  origin,
  now = new Date().toISOString(),
) {
  return {
    "@context": {
      dcat: "http://www.w3.org/ns/dcat#",
      dct: "http://purl.org/dc/terms/",
      foaf: "http://xmlns.com/foaf/0.1/",
      vcard: "http://www.w3.org/2006/vcard/ns#",
      spdx: "http://spdx.org/rdf/terms#",
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      xsd: "http://www.w3.org/2001/XMLSchema#",
    },
    "@id": `${origin}/api/v1/sdi/catalog`,
    "@type": "dcat:Catalog",
    "dct:title": "Katalog Data Terbuka Kabupaten Wajo",
    "dct:description":
      "Katalog dataset publik Kabupaten Wajo dengan distribusi berkas aktif dan metadata yang siap dipertukarkan.",
    "dct:publisher": {
      "@type": "foaf:Organization",
      "@id": "https://wajokab.go.id/",
      "foaf:name": "Pemerintah Kabupaten Wajo",
    },
    "dct:modified": now,
    "dcat:dataset": datasets.map(({ dataset, metadata, resources }) => {
      const organization = dataset.organizations || dataset.organization || {};
      const standard = metadata?.sds_code
        ? {
            "@type": "dct:Standard",
            "dct:identifier": metadata.sds_code,
            "dct:title": metadata.standard_concept || metadata.sds_code,
            "dct:description": metadata.standard_definition || undefined,
            "dct:hasVersion": metadata.sds_version || undefined,
          }
        : undefined;
      const mediaTypeFor = (resource) => {
        const mediaType =
          resource.mime_type ||
          formatByType[resource.format] ||
          "application/octet-stream";
        return `https://www.iana.org/assignments/media-types/${mediaType}`;
      };
      const record = {
        "@id": `${origin}/dataset/${encodeURIComponent(dataset.slug)}`,
        "@type": "dcat:Dataset",
        "dct:identifier": dataset.code || dataset.id,
        "dct:title": dataset.title,
        "dct:description": dataset.description,
        "dct:publisher": {
          "@type": "foaf:Organization",
          "@id": organization.slug
            ? `${origin}/organisasi/${encodeURIComponent(organization.slug)}`
            : undefined,
          "foaf:name": organization.name,
          "dct:identifier": organization.code,
        },
        "dct:issued": dataset.published_at
          ? { "@value": dataset.published_at.slice(0, 10), "@type": "xsd:date" }
          : undefined,
        "dct:modified": dataset.updated_at
          ? { "@value": dataset.updated_at.slice(0, 10), "@type": "xsd:date" }
          : undefined,
        "dcat:keyword": dataset.keywords || [],
        "dcat:accessURL": `${origin}/api/v1/datasets/${encodeURIComponent(dataset.slug)}`,
        "dcat:spatial": dataset.geographic_scope
          ? {
              "@type": "dct:Location",
              "dct:description": dataset.geographic_scope,
            }
          : undefined,
        // Map internal values to the Dublin Core Collection Description
        // Frequency vocabulary recommended by DCAT. A one-time dataset has no
        // recurring accrual periodicity, so do not invent a frequency URI.
        "dct:accrualPeriodicity": DCAT_FREQUENCY_URI[dataset.update_frequency]
          ? { "@id": DCAT_FREQUENCY_URI[dataset.update_frequency] }
          : undefined,
        "dct:rights": dataset.license_text,
        "dct:source": (() => {
          const source =
            metadata?.source_reference ||
            dataset.source_url ||
            dataset.source_name;
          if (!source) return undefined;
          return /^https?:\/\//i.test(source)
            ? { "@id": source }
            : { "@type": "dct:BibliographicResource", "dct:title": source };
        })(),
        "dct:conformsTo": standard,
        "dcat:distribution": resources.map((resource) => ({
          "@id": `${origin}/api/v1/datasets/${encodeURIComponent(dataset.slug)}/resources/${encodeURIComponent(resource.id)}`,
          "@type": "dcat:Distribution",
          "dct:title": resource.original_filename,
          "dcat:mediaType": { "@id": mediaTypeFor(resource) },
          "dcat:accessURL": `${origin}/api/v1/datasets/${encodeURIComponent(dataset.slug)}/resources/${encodeURIComponent(resource.id)}`,
          "dcat:downloadURL": `${origin}/api/v1/datasets/${encodeURIComponent(dataset.slug)}/resources/${encodeURIComponent(resource.id)}`,
          "dct:modified": resource.created_at
            ? {
                "@value": resource.created_at.slice(0, 10),
                "@type": "xsd:date",
              }
            : undefined,
          "dcat:byteSize": {
            "@value": Math.max(0, Number(resource.size_bytes) || 0),
            "@type": "xsd:nonNegativeInteger",
          },
          ...(resource.checksum_sha256
            ? {
                "spdx:checksum": {
                  "@type": "spdx:Checksum",
                  "spdx:algorithm": "spdx:checksumAlgorithm_sha256",
                  "spdx:checksumValue": resource.checksum_sha256,
                },
              }
            : {}),
        })),
      };
      if (dataset.reference_period_start || dataset.reference_period_end) {
        record["dct:temporal"] = {
          "@type": "dct:PeriodOfTime",
          ...(dataset.reference_period_start
            ? {
                "dcat:startDate": {
                  "@value": dataset.reference_period_start,
                  "@type": "xsd:date",
                },
              }
            : {}),
          ...(dataset.reference_period_end
            ? {
                "dcat:endDate": {
                  "@value": dataset.reference_period_end,
                  "@type": "xsd:date",
                },
              }
            : {}),
        };
      }
      if (dataset.contact) {
        record["dct:contactPoint"] = {
          "@type": "vcard:Kind",
          "vcard:fn": dataset.contact,
        };
      }
      if (dataset.license_text && /^https?:\/\//i.test(dataset.license_text)) {
        record["dct:license"] = { "@id": dataset.license_text };
      }
      return Object.fromEntries(
        Object.entries(record).filter(
          ([, value]) => value !== undefined && value !== null,
        ),
      );
    }),
  };
}
