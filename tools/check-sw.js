#!/usr/bin/env node
// Verifica l'elenco PRECACHE di sw.js: ogni file deve esistere (altrimenti cache.addAll fallisce
// e il Service Worker non si installa) e ogni file del sito deve essere elencato (altrimenti offline manca).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sw = readFileSync(join(root, "sw.js"), "utf8");
const list = JSON.parse(sw.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1].replace(/,\s*\]/, "]"));
const listed = new Set(list.filter((p) => p !== "./"));
const errors = [];

for (const p of listed) if (!existsSync(join(root, p))) errors.push(`in PRECACHE ma inesistente: ${p}`);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}
const site = [
  ...readdirSync(root).filter((f) => f.endsWith(".html")),
  ...walk(join(root, "assets"))
    .map((p) => relative(root, p).split("\\").join("/"))
    .filter((p) => /\.(js|css|json|woff2|svg)$/.test(p) && !p.endsWith("og-image.svg")),
];
for (const p of site) if (!listed.has(p)) errors.push(`file del sito non in PRECACHE: ${p}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`PRECACHE del Service Worker coerente (${listed.size} file).`);
