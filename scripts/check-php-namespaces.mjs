import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(root, "backend");
const appRoot = path.join(backend, "app");
const phpFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".php")) phpFiles.push(full);
  }
}
walk(appRoot);
walk(path.join(backend, "routes"));
walk(path.join(backend, "tests"));
walk(path.join(backend, "database"));

const declarations = new Map();
const contents = new Map();
for (const file of phpFiles) {
  const source = fs.readFileSync(file, "utf8");
  contents.set(file, source);
  const codeOnly = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ");
  const namespace = codeOnly.match(/\bnamespace\s+([^;]+);/)?.[1]?.trim();
  const declaration = codeOnly.match(
    /\b(?:abstract\s+|final\s+)?(?:class|interface|trait|enum)\s+(\w+)/,
  );
  if (namespace && declaration)
    declarations.set(`${namespace}\\${declaration[1]}`, file);
}

const errors = [];
for (const [file, source] of contents) {
  const relative = path.relative(root, file);
  for (const match of source.matchAll(
    /^\s*use\s+(App\\[A-Za-z0-9_\\]+)(?:\s+as\s+\w+)?\s*;/gm,
  )) {
    if (!declarations.has(match[1]))
      errors.push(`${relative}: import App tidak ditemukan: ${match[1]}`);
  }
  for (const match of (relative.startsWith(
    `backend${path.sep}routes${path.sep}`,
  )
    ? source
    : ""
  ).matchAll(/\b([A-Za-z0-9_]+)::class\s*,\s*['"]([A-Za-z0-9_]+)['"]/g)) {
    const [className, method] = [match[1], match[2]];
    const declaration = [...declarations.entries()].find(([name]) =>
      name.endsWith(`\\${className}`),
    );
    if (!declaration) {
      errors.push(
        `${relative}: controller pada rute tidak ditemukan: ${className}`,
      );
    } else if (
      !new RegExp(`\\bfunction\\s+${method}\\s*\\(`).test(
        contents.get(declaration[1]),
      )
    ) {
      errors.push(
        `${relative}: rute merujuk method yang tidak ditemukan: ${className}::${method}()`,
      );
    }
  }
}

// Explicitly verify every API controller has the shared base available.
for (const file of phpFiles.filter((candidate) =>
  candidate.includes(
    `${path.sep}Http${path.sep}Controllers${path.sep}Api${path.sep}`,
  ),
)) {
  const source = contents.get(file);
  if (
    /\bextends\s+Controller\b/.test(source) &&
    !declarations.has("App\\Http\\Controllers\\Controller")
  ) {
    errors.push(
      `${path.relative(root, file)}: kelas dasar App\\Http\\Controllers\\Controller tidak ditemukan`,
    );
  }
}

if (errors.length) {
  console.error(
    `Pemeriksaan namespace PHP gagal (${errors.length}):\n- ${errors.join("\n- ")}`,
  );
  process.exit(1);
}
console.log(
  `Pemeriksaan namespace PHP lulus (${phpFiles.length} berkas PHP; import App dan referensi method rute terverifikasi).`,
);
