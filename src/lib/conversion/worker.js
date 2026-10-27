import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { parse as parseCsv } from "csv-parse/sync";
import { stringify as stringifyCsv } from "csv-stringify/sync";

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_ROWS = 250_000;
const MAX_COLUMNS = 250;
// Prevent high-density files from multiplying into enormous in-memory exports.
const MAX_CELLS = 500_000;
const MAX_GEOJSON_COORDINATE_VALUES = 1_000_000;
const MAX_NESTING_DEPTH = 64;
const MAX_JSON_STRUCTURAL_TOKENS = MAX_CELLS * 4;
const MAX_XLSX_EXPANDED_BYTES = 100 * 1024 * 1024;
const MAX_XLSX_ENTRIES = 2_000;

/** Preflight JSON structure before JSON.parse allocates the whole object tree. */
function assertJsonComplexityBounds(text) {
  let inString = false;
  let escaped = false;
  let depth = 0;
  let structuralTokens = 0;
  for (const character of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{" || character === "[") {
      depth += 1;
      if (depth > MAX_NESTING_DEPTH) throw new Error("source_nesting_limit");
    } else if (character === "}" || character === "]") {
      depth -= 1;
      if (depth < 0) throw new Error("source_json_invalid");
    }
    if ("{}[]:,".includes(character)) {
      structuralTokens += 1;
      if (structuralTokens > MAX_JSON_STRUCTURAL_TOKENS) {
        throw new Error("source_cell_limit");
      }
    }
  }
  if (inString || depth !== 0) throw new Error("source_json_invalid");
}

/** Bound ZIP expansion and directory complexity before ExcelJS inflates XLSX. */
function assertXlsxArchiveBounds(buffer) {
  const minOffset = Math.max(0, buffer.length - 22 - 0xffff);
  let endOffset = -1;
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      const commentLength = buffer.readUInt16LE(offset + 20);
      if (offset + 22 + commentLength === buffer.length) {
        endOffset = offset;
        break;
      }
    }
  }
  if (endOffset < 0 || buffer.length < 22)
    throw new Error("source_xlsx_archive_invalid");

  const diskNumber = buffer.readUInt16LE(endOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(endOffset + 6);
  const diskEntryCount = buffer.readUInt16LE(endOffset + 8);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);
  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    diskEntryCount !== entryCount ||
    entryCount === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff ||
    entryCount > MAX_XLSX_ENTRIES ||
    centralDirectoryOffset + centralDirectorySize > endOffset
  ) {
    throw new Error("source_xlsx_archive_invalid");
  }

  let cursor = centralDirectoryOffset;
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  let expandedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (
      cursor + 46 > centralDirectoryEnd ||
      buffer.readUInt32LE(cursor) !== 0x02014b50
    ) {
      throw new Error("source_xlsx_archive_invalid");
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const expandedSize = buffer.readUInt32LE(cursor + 24);
    const filenameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const diskStart = buffer.readUInt16LE(cursor + 34);
    const recordLength = 46 + filenameLength + extraLength + commentLength;
    if (
      cursor + recordLength > centralDirectoryEnd ||
      (flags & 0x1) !== 0 ||
      diskStart !== 0 ||
      compressedSize === 0xffffffff ||
      expandedSize === 0xffffffff
    ) {
      throw new Error("source_xlsx_archive_invalid");
    }
    expandedBytes += expandedSize;
    if (expandedBytes > MAX_XLSX_EXPANDED_BYTES) {
      throw new Error("source_xlsx_expansion_limit");
    }
    cursor += recordLength;
  }
  if (cursor !== centralDirectoryEnd)
    throw new Error("source_xlsx_archive_invalid");
}

export async function parseTabularSource(buffer, format) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0 ||
    buffer.length > MAX_SOURCE_BYTES
  ) {
    throw new Error("source_size_invalid");
  }

  let rows;
  if (format === "csv") {
    let csvText;
    try {
      csvText = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new Error("source_encoding_invalid");
    }
    let parsedCells = 0;
    rows = parseCsv(csvText, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: false,
      max_record_size: 1024 * 1024,
      on_record(record) {
        if (record.length > MAX_COLUMNS) throw new Error("source_column_limit");
        parsedCells += record.length;
        if (parsedCells > MAX_CELLS) throw new Error("source_cell_limit");
        return record;
      },
    });
  } else if (format === "xlsx") {
    assertXlsxArchiveBounds(buffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("worksheet_missing");
    if (sheet.rowCount > MAX_ROWS) throw new Error("source_row_limit");
    if (sheet.columnCount > MAX_COLUMNS) throw new Error("source_column_limit");
    if (sheet.rowCount * sheet.columnCount > MAX_CELLS) {
      throw new Error("source_cell_limit");
    }
    rows = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      if (row.cellCount > MAX_COLUMNS) throw new Error("source_column_limit");
      rows.push(row.values.slice(1).map(normalizeExcelCellValue));
    });
  } else if (format === "json" || format === "geojson") {
    let sourceText;
    try {
      sourceText = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new Error("source_encoding_invalid");
    }
    assertJsonComplexityBounds(sourceText);
    let parsed;
    try {
      parsed = JSON.parse(sourceText);
    } catch {
      throw new Error("source_json_invalid");
    }
    if (format === "geojson") {
      validateGeoJson(parsed);
      return {
        geojson: parsed,
        rows:
          parsed.type === "FeatureCollection"
            ? parsed.features.map((feature) => ({
                geometry: feature.geometry,
                properties: feature.properties || {},
              }))
            : [],
      };
    }
    if (!Array.isArray(parsed)) throw new Error("json_must_be_array");
    rows = parsed;
  } else {
    throw new Error("source_format_unsupported");
  }

  if (!rows.length) throw new Error("source_empty");
  if (rows.length > MAX_ROWS) throw new Error("source_row_limit");

  if (Array.isArray(rows[0])) {
    if (rows.some((row) => !Array.isArray(row))) {
      throw new Error("tabular_shape_invalid");
    }
    let totalCells = 0;
    for (const row of rows) {
      if (row.length > MAX_COLUMNS) throw new Error("source_column_limit");
      totalCells += row.length;
      if (totalCells > MAX_CELLS) throw new Error("source_cell_limit");
    }
    const headers = rows[0].map((value, index) =>
      String(value ?? `kolom_${index + 1}`)
        .trim()
        .slice(0, 120),
    );
    if (
      new Set(headers.map((value) => value.toLowerCase())).size !==
      headers.length
    ) {
      throw new Error("duplicate_headers");
    }
    const records = rows
      .slice(1)
      .map((row) =>
        Object.fromEntries(
          headers.map((header, index) => [header, normalizeCell(row[index])]),
        ),
      )
      .filter((record) => !isEmptyRecord(record));
    return { headers, records };
  }

  if (!rows[0] || typeof rows[0] !== "object" || Array.isArray(rows[0])) {
    throw new Error("tabular_shape_invalid");
  }
  let totalCells = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("tabular_shape_invalid");
    }
    const cellCount = Object.keys(row).length;
    if (cellCount > MAX_COLUMNS) throw new Error("source_column_limit");
    totalCells += cellCount;
    if (totalCells > MAX_CELLS) throw new Error("source_cell_limit");
  }
  const sourceHeaders = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (sourceHeaders.length > MAX_COLUMNS)
    throw new Error("source_column_limit");
  const headers = sourceHeaders.map(
    (header, index) =>
      String(header).trim().slice(0, 120) || `kolom_${index + 1}`,
  );
  if (
    new Set(headers.map((header) => header.toLowerCase())).size !==
    headers.length
  ) {
    throw new Error("duplicate_headers");
  }
  const records = rows
    .map((row) =>
      Object.fromEntries(
        sourceHeaders.map((sourceHeader, index) => [
          headers[index],
          normalizeCell(row[sourceHeader]),
        ]),
      ),
    )
    .filter((record) => !isEmptyRecord(record));
  return { headers, records };
}

/** Collect the geometry types that occur in a valid GeoJSON object. */
export function getGeoJsonGeometryTypes(value) {
  const types = new Set();
  const visit = (entry) => {
    if (!entry || typeof entry !== "object") return;
    if (entry.type === "FeatureCollection") {
      for (const feature of entry.features || []) visit(feature);
      return;
    }
    if (entry.type === "Feature") {
      visit(entry.geometry);
      return;
    }
    if (entry.type === "GeometryCollection") {
      for (const geometry of entry.geometries || []) visit(geometry);
      return;
    }
    if (
      [
        "Point",
        "MultiPoint",
        "LineString",
        "MultiLineString",
        "Polygon",
        "MultiPolygon",
      ].includes(entry.type)
    ) {
      types.add(entry.type);
    }
  };
  visit(value);
  return [...types].sort();
}

/** Only point geometries have an unambiguous row/coordinate representation. */
export function isPointBasedGeoJson(value) {
  const types = getGeoJsonGeometryTypes(value);
  return (
    types.length > 0 &&
    types.every((type) => type === "Point" || type === "MultiPoint")
  );
}

/** Flatten Point/MultiPoint features while keeping the original GeoJSON separately. */
export function geoJsonToPointRecords(value) {
  const features =
    value?.type === "FeatureCollection"
      ? value.features
      : value?.type === "Feature"
        ? [value]
        : [{ type: "Feature", geometry: value, properties: {} }];
  const records = [];
  for (
    let featureIndex = 0;
    featureIndex < features.length;
    featureIndex += 1
  ) {
    const feature = features[featureIndex];
    const geometry = feature?.geometry;
    if (!geometry) continue;
    const points =
      geometry.type === "Point"
        ? [geometry.coordinates]
        : geometry.type === "MultiPoint"
          ? geometry.coordinates
          : [];
    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const coordinate = points[pointIndex];
      records.push({
        ...(feature.properties && typeof feature.properties === "object"
          ? feature.properties
          : {}),
        feature_id:
          feature.id === undefined || feature.id === null
            ? featureIndex + 1
            : String(feature.id),
        geometry_type: geometry.type,
        ...(geometry.type === "MultiPoint"
          ? { point_index: pointIndex + 1 }
          : {}),
        longitude: coordinate[0],
        latitude: coordinate[1],
        ...(coordinate.length > 2 ? { altitude: coordinate[2] } : {}),
      });
      if (records.length > MAX_ROWS) throw new Error("source_row_limit");
    }
  }
  return records;
}

function validateGeoJson(value) {
  const allowed = new Set([
    "FeatureCollection",
    "Feature",
    "Point",
    "MultiPoint",
    "LineString",
    "MultiLineString",
    "Polygon",
    "MultiPolygon",
    "GeometryCollection",
  ]);
  if (!value || typeof value !== "object" || !allowed.has(value.type)) {
    throw new Error("geojson_type_invalid");
  }

  let coordinateValues = 0;
  let propertyCells = 0;
  const checkCoordinates = (coordinates) => {
    if (!Array.isArray(coordinates)) {
      throw new Error("geojson_coordinates_invalid");
    }
    const stack = [{ value: coordinates, depth: 0 }];
    while (stack.length) {
      const current = stack.pop();
      if (current.depth > MAX_NESTING_DEPTH) {
        throw new Error("geojson_nesting_limit");
      }
      if (!Array.isArray(current.value) || current.value.length === 0) {
        throw new Error("geojson_coordinates_invalid");
      }
      const containsArrays = current.value.some(Array.isArray);
      if (!containsArrays) {
        if (
          current.value.length < 2 ||
          current.value.some(
            (value) => typeof value !== "number" || !Number.isFinite(value),
          )
        ) {
          throw new Error("geojson_coordinates_invalid");
        }
        coordinateValues += current.value.length;
        if (coordinateValues > MAX_GEOJSON_COORDINATE_VALUES) {
          throw new Error("geojson_coordinate_limit");
        }
        continue;
      }
      if (current.value.some((value) => !Array.isArray(value))) {
        throw new Error("geojson_coordinates_invalid");
      }
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        stack.push({ value: current.value[index], depth: current.depth + 1 });
      }
    }
  };

  const validGeometry = (geometry, depth = 0) => {
    if (
      depth > MAX_NESTING_DEPTH ||
      !geometry ||
      typeof geometry !== "object" ||
      ![
        "Point",
        "MultiPoint",
        "LineString",
        "MultiLineString",
        "Polygon",
        "MultiPolygon",
        "GeometryCollection",
      ].includes(geometry.type)
    ) {
      throw new Error(
        depth > MAX_NESTING_DEPTH
          ? "geojson_nesting_limit"
          : "geojson_geometry_invalid",
      );
    }
    if (geometry.type === "GeometryCollection") {
      if (!Array.isArray(geometry.geometries)) {
        throw new Error("geojson_geometry_invalid");
      }
      geometry.geometries.forEach((child) => validGeometry(child, depth + 1));
      return;
    }
    checkCoordinates(geometry.coordinates);
  };

  const validateProperties = (properties) => {
    if (
      !properties ||
      typeof properties !== "object" ||
      Array.isArray(properties)
    ) {
      throw new Error("geojson_feature_invalid");
    }
    const count = Object.keys(properties).length;
    if (count > MAX_COLUMNS) throw new Error("source_column_limit");
    propertyCells += count;
    if (propertyCells > MAX_CELLS) throw new Error("source_cell_limit");
  };

  if (value.type === "FeatureCollection") {
    if (!Array.isArray(value.features) || value.features.length > MAX_ROWS) {
      throw new Error("geojson_features_invalid");
    }
    for (const feature of value.features) {
      if (!feature || feature.type !== "Feature") {
        throw new Error("geojson_feature_invalid");
      }
      validateProperties(feature.properties || {});
      if (feature.geometry !== null) validGeometry(feature.geometry);
    }
  } else if (value.type === "Feature") {
    validateProperties(value.properties || {});
    if (!value.geometry) throw new Error("geojson_feature_invalid");
    validGeometry(value.geometry);
  } else {
    validGeometry(value);
  }
}

function normalizeExcelCellValue(value) {
  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }
  // ExcelJS represents formula cells as metadata objects. Export the cached
  // result rather than leaking formula definitions into the user-facing data;
  // blank formula results must remain blank so they cannot inflate PDF pages.
  if ("formula" in value || "sharedFormula" in value || "result" in value) {
    return value.result ?? "";
  }
  if (Array.isArray(value.richText)) {
    return value.richText.map((part) => part?.text ?? "").join("");
  }
  if ("text" in value) return value.text ?? "";
  if ("error" in value) return value.error ?? "";
  return value;
}

function isEmptyRecord(record) {
  const values = Array.isArray(record) ? record : Object.values(record || {});
  return values.every((value) => {
    if (value === null || value === undefined) return true;
    return String(normalizeCell(value)).trim() === "";
  });
}

function normalizeCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string")
    return value.replace(/\0/g, "").slice(0, 100_000);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value).slice(0, 100_000);
}

export function toCsv(headers, records) {
  const safe = (value) => {
    if (typeof value !== "string") return value;
    return /^[\s]*[=+@\-\t\r]/.test(value) ? `'${value}` : value;
  };
  return stringifyCsv(
    [
      headers.map(safe),
      ...records.map((row) => headers.map((header) => safe(row[header] ?? ""))),
    ],
    { bom: true, record_delimiter: "windows" },
  );
}

export async function toXlsx(headers, records) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Portal Satu Data Kabupaten Wajo";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Data");
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  for (const row of records)
    sheet.addRow(headers.map((header) => row[header] ?? ""));
  sheet.columns = headers.map((header) => ({
    header,
    width: Math.min(Math.max(String(header).length + 3, 14), 36),
  }));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function boundedPdfText(value, maxLength = 220) {
  // normalizeCell intentionally preserves numeric/boolean types for tabular
  // exports. PDF rendering is textual, so normalize the value to a string at
  // this boundary before applying string operations.
  const normalized = String(normalizeCell(value))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (normalized.length <= maxLength) return normalized || "—";
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function fitPdfCellText(
  doc,
  value,
  width,
  fontSize,
  maxHeight,
  fontFamily = "Helvetica",
) {
  const text = boundedPdfText(value);
  const availableWidth = Math.max(10, width);
  doc.font(fontFamily).fontSize(fontSize);
  const lineGap = 0.5;
  const paragraphGap = 0;
  const lineHeight = doc.heightOfString("Ag", {
    width: availableWidth,
    fontSize,
    lineGap,
    paragraphGap,
  });
  const maxLines = Math.max(
    1,
    Math.min(3, Math.floor((maxHeight + 0.1) / lineHeight)),
  );
  const fits = (candidate) => doc.widthOfString(candidate) <= availableWidth;
  const lines = [];
  let current = "";
  let truncated = false;

  const splitLongWord = (word) => {
    const chunks = [];
    let remaining = word;
    while (remaining) {
      let chunk = "";
      for (const character of remaining) {
        if (!fits(chunk + character)) break;
        chunk += character;
      }
      if (!chunk) chunk = Array.from(remaining)[0] || "";
      chunks.push(chunk);
      remaining = remaining.slice(chunk.length);
    }
    return chunks;
  };

  const words = text.split(/\s+/).filter(Boolean);
  for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
    const word = words[wordIndex];
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
      if (lines.length >= maxLines) {
        truncated = true;
        break;
      }
    }

    if (fits(word)) {
      current = word;
      continue;
    }

    const chunks = splitLongWord(word);
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
      if (chunkIndex < chunks.length - 1) {
        if (lines.length >= maxLines - 1) {
          current = chunks[chunkIndex];
          truncated = true;
          break;
        }
        lines.push(chunks[chunkIndex]);
      } else {
        current = chunks[chunkIndex];
      }
    }
    if (truncated) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) lines.push("—");

  if (truncated) {
    let last = lines[maxLines - 1] || "";
    while (last && !fits(`${last.trimEnd()}...`)) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}...`;
  }
  return lines.slice(0, maxLines).join("\n");
}

function drawPdfCellLines(
  doc,
  text,
  x,
  y,
  width,
  height,
  fontSize,
  color,
  fontFamily = "Helvetica",
  align = "left",
) {
  const lineGap = 0.5;
  const paragraphGap = 0;
  doc.font(fontFamily).fontSize(fontSize).fillColor(color);
  const lineHeight = doc.heightOfString("Ag", {
    width: Math.max(10, width),
    fontSize,
    lineGap,
    paragraphGap,
  });
  const lines = String(text).split("\n");
  const renderedHeight = lines.length * lineHeight;
  const startY = y + Math.max(0, (height - renderedHeight) / 2);
  lines.forEach((line, index) => {
    // Cell wrapping is completed before drawing. Disabling PDFKit's implicit
    // line wrapping keeps pagination exclusively under this table renderer.
    doc.text(line, x, startY + index * lineHeight, {
      width: Math.max(10, width),
      height: lineHeight + 0.2,
      lineBreak: false,
      lineGap,
      paragraphGap,
      align,
    });
  });
}

function calculatePdfColumnWidths(doc, columns, records, totalWidth) {
  const sample = records.slice(0, 24);
  const weights = columns.map((column) => {
    let maxLength = String(column).length;
    for (const record of sample) {
      const value = boundedPdfText(record[column], 60);
      maxLength = Math.max(maxLength, value.length);
    }
    return Math.min(2.35, Math.max(1, Math.sqrt(maxLength / 8)));
  });
  const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
  return weights.map((weight) => (totalWidth * weight) / weightTotal);
}

export async function toPdf(title, headers, records) {
  return new Promise((resolve, reject) => {
    const marginX = 36;
    const marginTop = 32;
    // Reserve a logical footer area for our manual paginator. PDFKit's own
    // text-flow boundary is intentionally lower than the table content bound:
    // footer text is drawn near the physical page bottom after all pages have
    // been buffered. If PDFKit thinks that footer text crosses its bottom
    // margin, each footer call can implicitly add another (mostly blank) page.
    const contentBottomReserve = 42;
    const pdfKitBottomMargin = 12;
    const pageWidth = 841.89;
    const tableWidth = pageWidth - marginX * 2;
    const palette = {
      navy: "#173B5B",
      blue: "#1D5FA7",
      blueDark: "#174F8B",
      pale: "#EEF5FB",
      text: "#20384A",
      muted: "#5A6F80",
      border: "#D7E2EB",
      stripe: "#F5F8FC",
      white: "#FFFFFF",
      accent: "#B9D5EC",
    };
    const safeTitle = boundedPdfText(title || "Ekspor Dataset", 160);
    const columns = headers.slice(0, 12);
    // Blank JSON records and formula-empty spreadsheet rows should not create
    // pages that look empty. Zero and false remain meaningful values.
    const nonEmptyRecords = records.filter((record) =>
      columns.some((column) => {
        const value = record?.[column];
        return (
          value !== null &&
          value !== undefined &&
          String(normalizeCell(value)).trim() !== ""
        );
      }),
    );
    const inputRows = records.length;
    const totalRows = nonEmptyRecords.length;
    const visibleRecords = nonEmptyRecords.slice(0, 5000);
    const skippedEmptyRows = inputRows - totalRows;
    const omittedColumns = Math.max(0, headers.length - columns.length);
    const omittedRows = Math.max(0, totalRows - visibleRecords.length);
    const createdAt =
      new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: {
        top: marginTop,
        bottom: pdfKitBottomMargin,
        left: marginX,
        right: marginX,
      },
      bufferPages: true,
      info: {
        Title: safeTitle,
        Author: "Portal Satu Data Kabupaten Wajo",
        Subject: "Ekspor dataset dalam format PDF",
        Creator: "Portal Satu Data Kabupaten Wajo",
      },
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const widths = calculatePdfColumnWidths(
      doc,
      columns,
      visibleRecords,
      tableWidth,
    );
    const fontSize = columns.length > 9 ? 6.6 : columns.length > 6 ? 7 : 7.4;
    const cellPadX = columns.length > 9 ? 4.5 : 6;
    const cellPadY = columns.length > 9 ? 4.2 : 5.2;
    const maxBodyTextHeight = 28;
    // Keep table rows clear of the footer even though PDFKit's flow boundary
    // extends farther down the page to allow deterministic manual footer text.
    const contentBottom = () => doc.page.height - contentBottomReserve;

    function drawReportHeader() {
      const x = marginX;
      const y = marginTop;
      const bannerHeight = 64;
      doc.save();
      doc.rect(x, y, tableWidth, bannerHeight).fill(palette.pale);
      doc.rect(x, y, 5, bannerHeight).fill(palette.blue);
      doc.restore();
      doc.font("Helvetica-Bold").fontSize(16).fillColor(palette.navy);
      doc.text(safeTitle, x + 17, y + 10, {
        width: tableWidth - 32,
        height: 23,
        lineBreak: false,
        ellipsis: true,
      });
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(palette.blue);
      doc.text("PORTAL SATU DATA KABUPATEN WAJO", x + 17, y + 37, {
        width: tableWidth - 32,
        lineBreak: false,
      });
      doc.font("Helvetica").fontSize(7.3).fillColor(palette.muted);
      const shownRange = `Menampilkan ${visibleRecords.length.toLocaleString("id-ID")} dari ${totalRows.toLocaleString("id-ID")} baris`;
      const columnRange = `Kolom ${columns.length} dari ${headers.length}`;
      doc.text(
        `${shownRange}  |  ${columnRange}  |  Dicetak ${createdAt}`,
        x,
        y + bannerHeight + 11,
        {
          width: tableWidth,
          lineBreak: false,
          ellipsis: true,
        },
      );
      let note =
        "Setiap sel dibatasi maksimal tiga baris agar tabel tetap terbaca. Unduh CSV/XLSX untuk data lengkap.";
      if (omittedRows || omittedColumns || skippedEmptyRows) {
        note = `PDF dibatasi 5.000 baris dan 12 kolom pertama. ${omittedRows ? `${omittedRows.toLocaleString("id-ID")} baris tidak disertakan. ` : ""}${skippedEmptyRows ? `${skippedEmptyRows.toLocaleString("id-ID")} baris kosong dilewati. ` : ""}${omittedColumns ? `${omittedColumns} kolom tidak disertakan. ` : ""}Unduh CSV/XLSX untuk data lengkap.`;
      }
      doc.font("Helvetica").fontSize(7.1).fillColor(palette.muted);
      doc.text(note, x, y + bannerHeight + 25, {
        width: tableWidth,
        lineBreak: false,
        ellipsis: true,
      });
      return y + bannerHeight + 43;
    }

    function drawContinuationHeader() {
      doc.font("Helvetica-Bold").fontSize(10).fillColor(palette.navy);
      doc.text(safeTitle, marginX, 20, {
        width: tableWidth * 0.72,
        lineBreak: false,
        ellipsis: true,
      });
      doc.font("Helvetica").fontSize(7).fillColor(palette.muted);
      doc.text("Portal Satu Data Kabupaten Wajo · lanjutan", marginX, 35, {
        width: tableWidth,
        lineBreak: false,
      });
      return 51;
    }

    function measureCell(
      text,
      width,
      size,
      maxHeight,
      fontFamily = "Helvetica",
    ) {
      const fitted = fitPdfCellText(
        doc,
        text,
        Math.max(10, width - cellPadX * 2),
        size,
        maxHeight,
        fontFamily,
      );
      doc.font(fontFamily).fontSize(size);
      return {
        text: fitted,
        height: doc.heightOfString(fitted, {
          width: Math.max(10, width - cellPadX * 2),
          fontSize: size,
          lineGap: 0.5,
          paragraphGap: 0,
        }),
      };
    }

    function drawTableHeader(y) {
      const measured = columns.map((column, index) =>
        measureCell(column, widths[index], fontSize, 30, "Helvetica-Bold"),
      );
      const rowHeight = Math.min(
        44,
        Math.max(27, ...measured.map((cell) => cell.height + cellPadY * 2)),
      );
      let x = marginX;
      columns.forEach((column, index) => {
        const width = widths[index];
        doc.save();
        doc
          .rect(x, y, width, rowHeight)
          .fillAndStroke(palette.blue, palette.blueDark);
        doc.restore();
        doc.font("Helvetica-Bold");
        drawPdfCellLines(
          doc,
          measured[index].text,
          x + cellPadX,
          y + cellPadY,
          width - cellPadX * 2,
          rowHeight - cellPadY * 2,
          fontSize,
          palette.white,
          "Helvetica-Bold",
        );
        x += width;
      });
      return y + rowHeight;
    }

    function measureRow(record) {
      const cells = columns.map((column, index) =>
        measureCell(record[column], widths[index], fontSize, maxBodyTextHeight),
      );
      return {
        cells,
        height: Math.min(
          maxBodyTextHeight + cellPadY * 2,
          Math.max(22, ...cells.map((cell) => cell.height + cellPadY * 2)),
        ),
      };
    }

    function drawBodyRow(row, index, y) {
      const fill = index % 2 === 0 ? palette.white : palette.stripe;
      doc.save();
      doc
        .rect(marginX, y, tableWidth, row.height)
        .fillAndStroke(fill, palette.border);
      doc.restore();
      let x = marginX;
      row.cells.forEach((cell, cellIndex) => {
        const width = widths[cellIndex];
        if (cellIndex > 0) {
          doc.save();
          doc
            .moveTo(x, y)
            .lineTo(x, y + row.height)
            .stroke(palette.border);
          doc.restore();
        }
        const maxY = y + row.height - cellPadY - cell.height;
        const textY = Math.max(
          y + cellPadY,
          y + (row.height - cell.height) / 2,
        );
        drawPdfCellLines(
          doc,
          cell.text,
          x + cellPadX,
          Math.min(textY, maxY),
          width - cellPadX * 2,
          row.height - cellPadY * 2,
          fontSize,
          palette.text,
        );
        x += width;
      });
      doc.save();
      doc
        .moveTo(marginX, y + row.height)
        .lineTo(marginX + tableWidth, y + row.height)
        .stroke(palette.border);
      doc.restore();
      return y + row.height;
    }

    let y = drawReportHeader();
    if (!columns.length) {
      doc.font("Helvetica").fontSize(10).fillColor(palette.muted);
      doc.text(
        "Tidak ada kolom yang dapat ditampilkan pada dataset ini.",
        marginX,
        y + 8,
        {
          width: tableWidth,
        },
      );
    } else {
      y = drawTableHeader(y + 4);
      visibleRecords.forEach((record, index) => {
        const row = measureRow(record);
        if (y + row.height > contentBottom()) {
          doc.addPage({
            size: "A4",
            layout: "landscape",
            margin: {
              top: marginTop,
              bottom: pdfKitBottomMargin,
              left: marginX,
              right: marginX,
            },
          });
          y = drawContinuationHeader();
          y = drawTableHeader(y);
        }
        y = drawBodyRow(row, index, y);
      });
      if (visibleRecords.length === 0) {
        doc.font("Helvetica").fontSize(9).fillColor(palette.muted);
        doc.text(
          "Dataset tidak memiliki baris data untuk ditampilkan.",
          marginX,
          y + 9,
          {
            width: tableWidth,
          },
        );
      }
    }

    const pageRange = doc.bufferedPageRange();
    for (
      let pageIndex = pageRange.start;
      pageIndex < pageRange.start + pageRange.count;
      pageIndex += 1
    ) {
      doc.switchToPage(pageIndex);
      const footerY = doc.page.height - 28;
      doc.save();
      doc
        .moveTo(marginX, footerY - 8)
        .lineTo(doc.page.width - marginX, footerY - 8)
        .stroke(palette.border);
      doc.restore();
      doc.font("Helvetica").fontSize(7).fillColor(palette.muted);
      doc.text(
        "Pemerintah Kabupaten Wajo · Portal Satu Data",
        marginX,
        footerY,
        {
          width: tableWidth * 0.7,
          height: 9,
          lineBreak: false,
        },
      );
      doc.text(
        `Halaman ${pageIndex + 1} dari ${pageRange.count}`,
        marginX + tableWidth * 0.7,
        footerY,
        {
          width: tableWidth * 0.3,
          height: 9,
          align: "right",
          lineBreak: false,
        },
      );
    }
    doc.end();
  });
}

export function toJson(headers, records) {
  // Compact JSON materially reduces generated storage and transfer size for
  // large public datasets; formatting is the consumer's responsibility.
  const rows = records.map((row) =>
    Object.fromEntries(headers.map((header) => [header, row[header] ?? ""])),
  );
  return Buffer.from(`${JSON.stringify(rows)}\n`, "utf8");
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function makeGeoJson(records) {
  return {
    type: "FeatureCollection",
    features: records.map((row) => {
      const geometry = row.geometry;
      if (!geometry || !geometry.type || !geometry.coordinates)
        throw new Error("geojson_geometry_required");
      return { type: "Feature", geometry, properties: row.properties || {} };
    }),
  };
}
