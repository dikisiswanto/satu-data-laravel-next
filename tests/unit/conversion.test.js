import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parseTabularSource,
  toCsv,
  toXlsx,
  sha256,
  getGeoJsonGeometryTypes,
  isPointBasedGeoJson,
  geoJsonToPointRecords,
  toPdf,
} from "../../src/lib/conversion/worker.js";

const workerSource = readFileSync(
  new URL("../../src/lib/conversion/worker.js", import.meta.url),
  "utf8",
);

describe("dataset conversion helpers", () => {
  it("parses CSV into headers and records", async () => {
    const result = await parseTabularSource(
      Buffer.from("nama,nilai\nA,10\nB,20\n", "utf8"),
      "csv",
    );
    expect(result.headers).toEqual(["nama", "nilai"]);
    expect(result.records).toHaveLength(2);
    expect(result.records[1].nilai).toBe("20");
  });
  it("removes separator-only and whitespace-only CSV rows from tabular exports", async () => {
    const result = await parseTabularSource(
      Buffer.from("nama,jumlah\nDesa A,10\n,\n   ,   \nDesa B,0\n", "utf8"),
      "csv",
    );
    expect(result.headers).toEqual(["nama", "jumlah"]);
    expect(result.records).toEqual([
      { nama: "Desa A", jumlah: "10" },
      { nama: "Desa B", jumlah: "0" },
    ]);
  });

  it("does not treat cached-empty Excel formulas as data rows", async () => {
    const xlsx = await toXlsx(
      ["Nama", "Jumlah"],
      [
        { Nama: "Desa A", Jumlah: 10 },
        {
          Nama: "   ",
          Jumlah: { formula: 'IF(1=1,"","x")', result: "" },
        },
        { Nama: "Desa B", Jumlah: 0 },
      ],
    );
    const result = await parseTabularSource(xlsx, "xlsx");
    expect(result.records).toEqual([
      { Nama: "Desa A", Jumlah: 10 },
      { Nama: "Desa B", Jumlah: 0 },
    ]);
  });

  it("rejects duplicate CSV headers", async () => {
    await expect(
      parseTabularSource(Buffer.from("nama,nama\nA,B\n", "utf8"), "csv"),
    ).rejects.toThrow("duplicate_headers");
  });
  it("preserves columns that appear after the first JSON record", async () => {
    const result = await parseTabularSource(
      Buffer.from(
        JSON.stringify([{ nama: "Desa A" }, { nama: "Desa B", jumlah: 12 }]),
        "utf8",
      ),
      "json",
    );
    expect(result.headers).toEqual(["nama", "jumlah"]);
    expect(result.records[0]).toEqual({ nama: "Desa A", jumlah: "" });
    expect(result.records[1]).toEqual({ nama: "Desa B", jumlah: 12 });
  });
  it("validates GeoJSON and preserves feature properties for export", async () => {
    const source = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [120.0, -4.0] },
          properties: { nama: "Desa A", jumlah: 10 },
        },
      ],
    };
    const result = await parseTabularSource(
      Buffer.from(JSON.stringify(source), "utf8"),
      "geojson",
    );
    expect(result.geojson.type).toBe("FeatureCollection");
    expect(result.rows[0].properties.nama).toBe("Desa A");
    expect(result.rows[0].geometry.coordinates).toEqual([120, -4]);
  });
  it("keeps polygon and line GeoJSON in native geospatial form", () => {
    const polygon = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [1, 2],
                [3, 2],
                [3, 4],
                [1, 2],
              ],
            ],
          },
          properties: { nama: "Wilayah" },
        },
      ],
    };
    expect(getGeoJsonGeometryTypes(polygon)).toEqual(["Polygon"]);
    expect(isPointBasedGeoJson(polygon)).toBe(false);
    expect(
      isPointBasedGeoJson({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [1, 2] },
            properties: {},
          },
        ],
      }),
    ).toBe(true);
  });
  it("flattens point GeoJSON only for tabular exports while retaining coordinate and feature identity", () => {
    const source = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "school-1",
          geometry: { type: "Point", coordinates: [120.1, -4.1, 12] },
          properties: { nama: "Sekolah" },
        },
      ],
    };
    expect(geoJsonToPointRecords(source)).toEqual([
      {
        nama: "Sekolah",
        feature_id: "school-1",
        geometry_type: "Point",
        longitude: 120.1,
        latitude: -4.1,
        altitude: 12,
      },
    ]);
  });
  it("rejects malformed XLSX archives before workbook decompression", async () => {
    await expect(
      parseTabularSource(Buffer.from("not-a-zip"), "xlsx"),
    ).rejects.toThrow("source_xlsx_archive_invalid");
  });
  it("rejects deeply nested JSON before allocating nested export structures", async () => {
    const source = `${"[".repeat(66)}0${"]".repeat(66)}`;
    await expect(
      parseTabularSource(Buffer.from(source), "json"),
    ).rejects.toThrow("source_nesting_limit");
  });
  it("rejects malformed scalar GeoJSON coordinates", async () => {
    const source = { type: "Point", coordinates: 120 };
    await expect(
      parseTabularSource(Buffer.from(JSON.stringify(source)), "geojson"),
    ).rejects.toThrow("geojson_coordinates_invalid");
  });
  it("neutralizes spreadsheet formula prefixes in CSV exports", () => {
    const output = toCsv(["nilai"], [{ nilai: "=1+1" }]);
    expect(output).toContain("'=1+1");
  });
  it("renders PDF data as a styled, paginated table", async () => {
    const headers = ["Nama Desa", "Jumlah Penduduk", "Kecamatan"];
    const records = Array.from({ length: 90 }, (_, index) => ({
      "Nama Desa": `Desa ${index + 1} dengan nama yang cukup panjang untuk diuji`,
      "Jumlah Penduduk": index * 137,
      Kecamatan: index % 2 ? "Tempe" : "Belawa",
    }));
    const pdf = await toPdf("Rekap Dataset Desa", headers, records);
    const encoded = pdf.toString("latin1");
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    // PDFKit compresses page content by default, so page text should not be
    // asserted by searching the raw byte stream. Count actual Page objects
    // instead of depending on the internal Pages-tree /Count representation.
    expect(pdf.byteLength).toBeGreaterThan(1_000);
    expect(encoded).toContain("/Title");
    const pageObjectCount = (encoded.match(/\/Type\s*\/Page(?=[\s/>])/g) || [])
      .length;
    const declaredPageCount = Number(
      encoded.match(/\/Type\s*\/Pages\b[\s\S]{0,512}?\/Count\s+(\d+)/)?.[1] ||
        0,
    );
    const pageCount = Math.max(pageObjectCount, declaredPageCount);
    expect(
      pageCount,
      `Expected a multi-page PDF (page objects: ${pageObjectCount}, declared: ${declaredPageCount})`,
    ).toBeGreaterThan(1);
    // Pagination must be explicit so long cell text cannot trigger a second,
    // implicit page break in the PDF renderer.
    expect(workerSource).toContain("if (y + row.height > contentBottom())");
    expect(workerSource).toContain("doc.addPage({");
    expect(workerSource).toContain("Title: safeTitle");
    expect(workerSource).toContain("Author: siteConfig.name");
    expect(workerSource).toContain(
      "fillAndStroke(palette.blue, palette.blueDark)",
    );
    expect(workerSource).toContain("palette.stripe");
    expect(workerSource).toContain("drawTableHeader");
    expect(workerSource).toContain("drawPdfCellLines");
    expect(workerSource).toMatch(
      /doc\.text\(line,[\s\S]{0,260}lineBreak:\s*false/,
    );
    expect(workerSource).toContain("const nonEmptyRecords = records.filter");
    expect(workerSource).toContain("skippedEmptyRows");
    expect(workerSource).toContain(
      "Halaman ${pageIndex + 1} dari ${pageRange.count}",
    );
  });
  it("does not create implicit blank pages when exporting around 1,050 rows", async () => {
    const headers = ["Kode", "Nama", "Kecamatan", "Jumlah"];
    const records = Array.from({ length: 1050 }, (_, index) => ({
      Kode: `W${String(index + 1).padStart(4, "0")}`,
      Nama: `Lokasi ${index + 1}`,
      Kecamatan: ["Tempe", "Belawa", "Tanasitolo"][index % 3],
      Jumlah: index * 3,
    }));

    const pdf = await toPdf("Uji 1.050 Baris", headers, records);
    const encoded = pdf.toString("latin1");
    const objectPageCount = (encoded.match(/\/Type\s*\/Page(?=[\s/>])/g) || [])
      .length;
    const declaredPageCount = Number(
      encoded.match(/\/Type\s*\/Pages\b[\s\S]{0,512}?\/Count\s+(\d+)/)?.[1] ||
        0,
    );
    const pageCount = Math.max(objectPageCount, declaredPageCount);

    // Roughly 1,050 short rows should fit in dozens of landscape pages, not
    // 171 pages. The generous bound allows future typography changes while
    // catching accidental PDFKit pages caused by footer text overflow.
    expect(pageCount).toBeGreaterThan(1);
    expect(pageCount).toBeLessThan(90);
    expect(workerSource).toContain("const pdfKitBottomMargin = 12;");
    expect(workerSource).toContain("bottom: pdfKitBottomMargin");
    expect(workerSource).toContain("height: 9");
  });

  it("computes a stable SHA-256 checksum", () => {
    expect(sha256(Buffer.from("wajo"))).toMatch(/^[a-f0-9]{64}$/);
  });
});
