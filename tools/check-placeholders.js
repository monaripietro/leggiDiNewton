#!/usr/bin/env node
// Fallisce se nel sito pubblicato resta il segnaposto [[DA VERIFICARE]] (SPEC sez. 6.3).
// La documentazione (docs/, README.md) è esclusa: lì il segnaposto può comparire nelle istruzioni.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const MARK = "[[DA VERIFICARE]]";
const skip = new Set(["docs", "node_modules", ".git", "tools", "tests", "README.md"]);
const exts = /\.(html|js|json|css|svg|md|xml|txt)$/;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (skip.has(e.name)) return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : exts.test(e.name) ? [p] : [];
  });
}

const hits = [];
for (const file of walk(root)) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (line.includes(MARK)) hits.push(`${relative(root, file)}:${i + 1}`);
  });
}
if (hits.length) {
  console.error(`Segnaposto ${MARK} ancora presenti:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log(`Nessun segnaposto ${MARK} nel sito.`);
