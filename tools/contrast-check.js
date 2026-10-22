#!/usr/bin/env node
// Verifica i rapporti di contrasto WCAG delle coppie di token in assets/css/tokens.css,
// per il tema chiaro (:root) e scuro ([data-theme="dark"]). Esce con codice 1 se una coppia non passa.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = readFileSync(fileURLToPath(new URL("../assets/css/tokens.css", import.meta.url)), "utf8");

function readBlock(selectorRegex) {
  const m = css.match(selectorRegex);
  if (!m) throw new Error("Blocco non trovato: " + selectorRegex);
  const tokens = {};
  for (const [, name, value] of m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) tokens[name] = value;
  return tokens;
}

const light = readBlock(/^:root \{([\s\S]*?)^\}/m);
const dark = { ...light, ...readBlock(/^:root\[data-theme="dark"\] \{([\s\S]*?)^\}/m) };

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
export function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const backgrounds = ["bg", "surface", "mint", "peach", "lavender", "sky", "lemon"];
const pairs = [];
for (const b of backgrounds) {
  pairs.push(["ink", b, 4.5], ["ink-soft", b, 4.5], ["accent", b, b === "bg" || b === "surface" ? 4.5 : 3]);
}
pairs.push(["on-accent", "accent", 4.5], ["focus", "bg", 3], ["focus", "surface", 3], ["border", "surface", 3], ["border", "bg", 3]);
for (const v of ["vec-v", "vec-f", "vec-a", "sim-ground", "sim-body"]) pairs.push([v, "surface", 3]);

let failed = 0;
for (const [themeName, t] of [["chiaro", light], ["scuro", dark]]) {
  console.log(`\nTema ${themeName}`);
  for (const [fg, bg, min] of pairs) {
    const r = ratio(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} --${fg} su --${bg}: ${r.toFixed(2)}:1 (min ${min})`);
  }
}
if (failed) {
  console.error(`\n${failed} coppie sotto soglia`);
  process.exit(1);
}
console.log("\nTutti i contrasti sono conformi.");
