import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const files = [];
const errors = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(?:js|jsx|mjs|cjs)$/.test(entry.name)) files.push(file);
  }
}

async function resolveLocalImport(from, specifier) {
  if (specifier.endsWith(".css") || specifier.endsWith(".scss")) {
    const target = path.resolve(path.dirname(from), specifier);
    try { return (await stat(target)).isFile() ? target : null; } catch { return null; }
  }
  const base = specifier.startsWith("@/")
    ? path.join(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(from), specifier);
  for (const candidate of [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`, path.join(base, "index.js"), path.join(base, "index.jsx")]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {}
  }
  return null;
}

function hasNamedExport(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `export\\s+(?:async\\s+)?(?:function|const|let|var|class)\\s+${escaped}(?:\\b|\\s*[:=])|export\\s*\\{[^}]*\\b${escaped}\\b`,
  ).test(source);
}

await walk(sourceRoot);
for (const file of files) {
  const source = await readFile(file, "utf8");
  const imports = /import\s+(?:type\s+)?(?:\{([^}]+)\}|([\w$]+)\s*(?:,\s*\{([^}]+)\})?|\*\s+as\s+\w+)\s+from\s+["']([^"']+)["']/g;
  let match;
  while ((match = imports.exec(source))) {
    const specifier = match[4];
    if (!specifier.startsWith(".") && !specifier.startsWith("@/")) continue;
    const target = await resolveLocalImport(file, specifier);
    if (!target) {
      errors.push(`${path.relative(root, file)}: unresolved local import ${specifier}`);
      continue;
    }
    if (target.endsWith(".css") || target.endsWith(".scss")) continue;
    const targetSource = await readFile(target, "utf8");
    const names = (match[1] || match[3] || "")
      .split(",")
      .map((part) => part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    for (const name of names) {
      if (!hasNamedExport(targetSource, name)) {
        errors.push(`${path.relative(root, file)}: named export ${name} not found in ${path.relative(root, target)}`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Local import checks passed (${files.length} JS/JSX modules).`);
