#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const baseValue = process.env.LEGACY_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const bucket = (process.env.LEGACY_STORAGE_BUCKET || "dataset-files").replace(/^\/+|\/+$/g, "");
const outputRoot = resolve(process.env.LEGACY_STORAGE_OUTPUT || "./legacy-storage-export");
const pageSize = 100;

if (!baseValue || !key) {
  console.error("Set LEGACY_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in the environment.");
  process.exit(2);
}
let base;
try {
  base = new URL(baseValue);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error('invalid_url');
  if (base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname)) throw new Error('https_required');
} catch {
  console.error("LEGACY_SUPABASE_URL must be a valid HTTPS project URL (HTTP is allowed only for localhost).");
  process.exit(2);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
async function request(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Storage API HTTP ${response.status}: ${body.replace(/[\r\n\t]+/g, ' ').slice(0, 180)}`);
  }
  return response;
}
function objectUrl(path, authenticated = true) {
  const encoded = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  return new URL(`/storage/v1/object/${authenticated ? 'authenticated' : 'public'}/${encodeURIComponent(bucket)}/${encoded}`, base);
}
function safeTarget(path) {
  const target = resolve(outputRoot, path);
  if (target !== outputRoot && !target.startsWith(`${outputRoot}${sep}`)) throw new Error('Unsafe object path from Storage API');
  return target;
}
async function list(prefix, offset) {
  const response = await request(new URL(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, base), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } }),
  });
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error(`Unexpected listing response for prefix ${prefix || '(root)'}`);
  return payload;
}
const seen = new Set();
let downloaded = 0;
let skippedExisting = 0;
let totalBytes = 0;
async function walk(prefix = '') {
  for (let offset = 0; ; offset += pageSize) {
    const entries = await list(prefix, offset);
    for (const entry of entries) {
      const name = String(entry.name || '');
      if (!name || name === '.' || name === '..' || name.includes('\\') || name.split('/').includes('..')) continue;
      const objectPath = `${prefix}${name}`;
      if (entry.id == null && entry.metadata == null) {
        await walk(`${objectPath.replace(/\/$/, '')}/`);
        continue;
      }
      if (seen.has(objectPath)) continue;
      seen.add(objectPath);
      const target = safeTarget(objectPath);
      await mkdir(dirname(target), { recursive: true });
      try {
        const details = await stat(target);
        const expected = Number(entry.metadata?.size);
        if (details.isFile() && expected > 0 && details.size === expected) {
          skippedExisting++;
          continue;
        }
      } catch {}
      const response = await request(objectUrl(objectPath));
      const tempTarget = `${target}.download-${process.pid}`;
      try {
        const writer = createWriteStream(tempTarget, { flags: 'w' });
        await pipeline(Readable.fromWeb(response.body), writer);
        const details = await stat(tempTarget);
        const expectedSize = Number(entry.metadata?.size);
        if (Number.isFinite(expectedSize) && expectedSize >= 0 && details.size !== expectedSize) throw new Error(`Downloaded size mismatch for ${objectPath}`);
        const { rename } = await import('node:fs/promises');
        await rename(tempTarget, target);
        downloaded++;
        totalBytes += details.size;
        if (downloaded % 25 === 0) console.log(`Downloaded ${downloaded} objects (${(totalBytes / 1024 / 1024).toFixed(1)} MiB)`);
      } catch (error) {
        const { rm } = await import('node:fs/promises');
        await rm(tempTarget, { force: true }).catch(() => {});
        throw error;
      }
    }
    if (entries.length < pageSize) break;
  }
}

try {
  console.log(`Exporting Storage bucket '${bucket}' to ${outputRoot}`);
  await mkdir(outputRoot, { recursive: true });
  await walk('');
  console.log(`Done: ${downloaded} downloaded, ${skippedExisting} already present, ${(totalBytes / 1024 / 1024).toFixed(1)} MiB written.`);
  console.log('Keep this export private: it may contain unpublished source data.');
} catch (error) {
  console.error(`Storage export failed: ${error?.message || 'unknown error'}`);
  process.exit(1);
}
