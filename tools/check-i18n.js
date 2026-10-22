#!/usr/bin/env node
// Confronta le chiavi di tutti i dizionari in assets/i18n e verifica che ogni chiave usata
// nell'HTML (data-i18n, data-i18n-attr) e nel JavaScript (t("...")) esista. Esce con 1 se manca qualcosa.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dir = join(root, "assets/i18n");

function flatten(obj, prefix = "", out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

const dicts = Object.fromEntries(
  readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => [f.replace(".json", ""), flatten(JSON.parse(readFileSync(join(dir, f), "utf8")))]),
);
const langs = Object.keys(dicts);
const errors = [];

// 1. stesse chiavi in tutte le lingue, stessi segnaposto {var}
const all = new Set(langs.flatMap((l) => [...dicts[l].keys()]));
for (const key of all) {
  for (const l of langs) {
    if (!dicts[l].has(key)) errors.push(`[${l}] chiave mancante: ${key}`);
    else if (typeof dicts[l].get(key) === "string" && !dicts[l].get(key).trim()) errors.push(`[${l}] chiave vuota: ${key}`);
  }
  const vars = langs.filter((l) => dicts[l].has(key)).map((l) => [...String(dicts[l].get(key)).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(","));
  if (new Set(vars).size > 1) errors.push(`segnaposto diversi tra le lingue: ${key}`);
}

// 2. chiavi usate nel codice
const used = new Set();
const htmlFiles = readdirSync(root).filter((f) => f.endsWith(".html"));
for (const f of htmlFiles) {
  const html = readFileSync(join(root, f), "utf8");
  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) used.add(m[1]);
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const pair of m[1].split(";")) used.add(pair.split(":")[1].trim());
  const page = html.match(/<body[^>]*data-page="([^"]+)"/)?.[1];
  if (page) used.add(`${page}.meta.title`).add(`${page}.meta.description`);
}
function walk(d) {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
}
for (const f of walk(join(root, "assets/js")).filter((p) => p.endsWith(".js"))) {
  const js = readFileSync(f, "utf8");
  for (const m of js.matchAll(/\bt\(\s*"([\w.]+)"/g)) used.add(m[1]);
}
for (const key of used) if (!dicts.it.has(key)) errors.push(`chiave usata ma non definita: ${key}`);

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problemi nei dizionari.`);
  process.exit(1);
}
console.log(`Dizionari allineati (${langs.join(", ")}): ${all.size} chiavi, ${used.size} chiavi statiche verificate.`);
