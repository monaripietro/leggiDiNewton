#!/usr/bin/env node
// Verifica i link interni: ogni href/src relativo nelle pagine HTML e nei dizionari deve puntare
// a un file esistente, e ogni ancora (#id) deve esistere nella pagina di destinazione.
// Vieta i percorsi assoluti che iniziano con "/" (il sito vive in /<nome-repo>/).
// Con --external controlla anche che gli URL esterni rispondano 200 (richiede rete).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRich } from "../assets/js/richtext.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const pages = readdirSync(root).filter((f) => f.endsWith(".html"));
const ids = Object.fromEntries(pages.map((p) => [p, new Set([...readFileSync(join(root, p), "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
const errors = [];
const external = new Set();

function checkRef(from, ref) {
  if (/^(https?:|mailto:|data:)/.test(ref)) {
    if (ref.startsWith("http")) external.add(ref);
    return;
  }
  if (ref.startsWith("/")) return errors.push(`${from}: percorso assoluto vietato "${ref}"`);
  const [pathPart, hash] = ref.split("#");
  const target = pathPart.split("?")[0] || from;
  if (target && !existsSync(join(root, target))) return errors.push(`${from}: file inesistente "${ref}"`);
  if (hash && target.endsWith(".html") && !ids[target]?.has(hash)) errors.push(`${from}: ancora inesistente "${ref}"`);
}

for (const p of pages) {
  const html = readFileSync(join(root, p), "utf8");
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) checkRef(p, m[1]);
}
// link dentro i testi tradotti (mini-markup [testo](url))
function walkStrings(obj, cb) {
  for (const v of Object.values(obj)) typeof v === "string" ? cb(v) : walkStrings(v, cb);
}
for (const lang of readdirSync(join(root, "assets/i18n"))) {
  walkStrings(JSON.parse(readFileSync(join(root, "assets/i18n", lang), "utf8")), (s) => {
    for (const tok of parseRich(s)) if (tok.type === "link") checkRef(`i18n/${lang}`, tok.href);
  });
}

if (process.argv.includes("--external")) {
  for (const url of external) {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "newton-in-movimento-linkcheck" } });
      if (res.status !== 200) errors.push(`URL esterno ${res.status}: ${url}`);
      else console.log(`200 ${url}`);
    } catch (e) {
      errors.push(`URL esterno non raggiungibile: ${url} (${e.message})`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Link interni validi (${pages.length} pagine, ${external.size} URL esterni ${process.argv.includes("--external") ? "verificati" : "non verificati: usa --external"}).`);
