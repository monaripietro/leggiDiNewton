#!/usr/bin/env node
// Script di build FACOLTATIVO (il sito funziona così com'è nel repository).
// Rigenera dentro le pagine HTML:
//   1. le parti condivise (<!-- @head -->, <!-- @header -->, <!-- @footer -->) da partials/;
//   2. i blocchi ripetitivi (<!-- @question -->, <!-- @predict -->, <!-- @event -->, <!-- @myths -->, <!-- @pager -->);
//   3. il testo italiano di fallback di ogni elemento con data-i18n / data-i18n-attr, da assets/i18n/it.json.
// Così l'HTML resta leggibile senza JavaScript e indicizzabile, e i testi hanno un'unica fonte: i JSON.
// Uso: node tools/build.js          → riscrive le pagine
//      node tools/build.js --check  → esce con 1 se una pagina non è aggiornata (usato in CI)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRich, isExternal, isSafeHref } from "../assets/js/richtext.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const it = JSON.parse(readFileSync(join(root, "assets/i18n/it.json"), "utf8"));
const partial = (name) => readFileSync(join(root, "partials", `${name}.html`), "utf8").trim();
const check = process.argv.includes("--check");

const lookup = (key) => key.split(".").reduce((n, p) => (n == null ? undefined : n[p]), it);
const has = (key) => typeof lookup(key) === "string";
function t(key) {
  const v = lookup(key);
  if (typeof v !== "string") throw new Error(`Chiave i18n mancante in it.json: ${key}`);
  return v;
}

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Converte il mini-markup in HTML (stessa logica di setRich in i18n.js). */
function richToHtml(str) {
  return parseRich(str)
    .map((tok) => {
      const text = escapeHtml(tok.text);
      if (tok.type === "text") return text;
      if (tok.type === "strong" || tok.type === "em") return `<${tok.type}>${text}</${tok.type}>`;
      if (!isSafeHref(tok.href)) return text;
      if (isExternal(tok.href)) {
        return `<a href="${escapeHtml(tok.href)}" rel="external noopener noreferrer">${text}<small class="visually-hidden"> ${escapeHtml(t("common.externalLink"))}</small></a>`;
      }
      return `<a href="${escapeHtml(tok.href)}">${text}</a>`;
    })
    .join("");
}

const attrs = (s) => Object.fromEntries([...s.matchAll(/(\w+)=([^\s]+)/g)].map((m) => [m[1], m[2]]));

// ---------- generatori di blocchi ----------
const generators = {
  head: (a, ctx) =>
    partial("head")
      .replaceAll("{{title}}", escapeHtml(t(`${ctx.page}.meta.title`)))
      .replaceAll("{{description}}", escapeHtml(t(`${ctx.page}.meta.description`)))
      .replaceAll("{{file}}", ctx.file),

  header: (a, ctx) => partial("header").replace(`data-nav="${ctx.page}"`, `data-nav="${ctx.page}" aria-current="page"`),

  footer: () => partial("footer"),

  /** Domanda a scelta multipla con feedback formativo immediato. */
  question: (a) => {
    const key = a.key;
    const name = key.replace(/\./g, "-");
    const opts = ["a", "b", "c"]
      .map((o) => `      <label class="option"><input type="radio" name="${name}" value="${o}"> <span data-i18n="${key}.${o}"></span></label>`)
      .join("\n");
    return `<form class="question" data-quiz="${key}" data-correct="${a.correct}" novalidate>
  <fieldset>
    <legend data-i18n="${key}.text"></legend>
    <div class="options">
${opts}
    </div>
    <button type="submit" class="btn btn-primary" data-i18n="common.quiz.check"></button>
    <div class="feedback" role="status" aria-live="polite"></div>
  </fieldset>
</form>`;
  },

  /** Previsione: il feedback arriva solo dopo aver provato la simulazione. */
  predict: (a) => {
    const key = a.key;
    const name = key.replace(/\./g, "-");
    const opts = ["a", "b", "c"]
      .map((o) => `      <label class="option"><input type="radio" name="${name}" value="${o}"> <span data-i18n="${key}.${o}"></span></label>`)
      .join("\n");
    return `<form class="question predict" data-predict="${key}" data-correct="${a.correct}" novalidate>
  <fieldset>
    <legend data-i18n="${key}.text"></legend>
    <div class="options">
${opts}
    </div>
    <button type="submit" class="btn btn-primary" data-role="confirm" data-i18n="common.predict.confirm"></button>
    <p class="feedback" data-role="status" role="status" aria-live="polite"></p>
    <button type="button" class="btn" data-role="reveal" hidden data-i18n="common.predict.reveal"></button>
    <div class="feedback" data-role="result" aria-live="polite"></div>
  </fieldset>
</form>`;
  },

  /** Tappa della linea del tempo. */
  event: (a) => {
    const k = `history.events.${a.id}`;
    const badge = { doc: "badge-doc", trad: "badge-trad", debate: "badge-debate" }[a.badge];
    const parts = [
      `<li id="ev-${a.id}" data-badge="${a.badge}">`,
      `  <article class="event law-${a.law}" aria-labelledby="ev-${a.id}-title">`,
      `    <div class="event-meta"><span class="when" data-i18n="${k}.when"></span> <span class="badge ${badge}" data-i18n="common.badge.${a.badge}"></span></div>`,
      `    <h2 id="ev-${a.id}-title" data-i18n="${k}.title"></h2>`,
      `    <p data-i18n="${k}.text"></p>`,
    ];
    if (has(`${k}.note`)) {
      const cls = a.badge === "trad" ? "callout callout-warn" : "note";
      if (a.badge === "trad") {
        parts.push(`    <div class="${cls}"><p class="callout-title" data-i18n="common.warn"></p><p data-i18n="${k}.note"></p></div>`);
      } else {
        parts.push(`    <p class="${cls}" data-i18n="${k}.note"></p>`);
      }
    }
    parts.push(`    <div class="why"><strong data-i18n="history.whyLabel"></strong> <span data-i18n="${k}.why"></span></div>`);
    if (has(`${k}.bridge`)) parts.push(`    <p class="bridge" data-i18n="${k}.bridge"></p>`);
    parts.push(`    <p class="source-ref"><span data-i18n="history.sourceLabel"></span>: <span data-i18n="${k}.source"></span></p>`);
    parts.push(`  </article>`, `</li>`);
    return parts.join("\n");
  },

  /** Elenco delle misconcezioni di una legge. */
  myths: (a) => {
    const items = ["1", "2", "3"]
      .filter((n) => has(`${a.law}.myths.${n}.myth`))
      .map(
        (n) => `  <li>
    <p class="myth"><span class="visually-hidden" data-i18n="common.myth"></span> <span data-i18n="${a.law}.myths.${n}.myth"></span></p>
    <p class="fact"><span class="visually-hidden" data-i18n="common.fact"></span> <span data-i18n="${a.law}.myths.${n}.fact"></span></p>
  </li>`,
      )
      .join("\n");
    return `<ul class="misconceptions">\n${items}\n</ul>`;
  },

  /** Navigazione precedente/successiva. */
  pager: (a) => `<nav class="pager" data-i18n-attr="aria-label:common.pagerLabel">
  <a class="btn" href="${a.prev}" rel="prev" data-i18n="${a.key}.prev"></a>
  <a class="btn btn-primary" href="${a.next}" rel="next" data-i18n="${a.key}.next"></a>
</nav>`,
};

function expandBlocks(html, ctx) {
  return html.replace(/<!-- @(\w+)([^>]*?)-->[\s\S]*?<!-- \/@\1 -->/g, (m, name, argStr) => {
    const gen = generators[name];
    if (!gen) throw new Error(`Blocco sconosciuto @${name} in ${ctx.file}`);
    return `<!-- @${name}${argStr}-->\n${gen(attrs(argStr), ctx)}\n<!-- /@${name} -->`;
  });
}

function fillTranslations(html) {
  // testo degli elementi foglia con data-i18n
  html = html.replace(/(<(\w+)\b[^>]*?\sdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, tag, key, content, close) => {
    return `${open}${richToHtml(t(key))}${close}`;
  });
  // attributi tradotti
  html = html.replace(/<(\w+)\b([^>]*?)\sdata-i18n-attr="([^"]+)"([^>]*)>/g, (m, tag, before, spec, after) => {
    let rest = `${before} data-i18n-attr="${spec}"${after}`;
    for (const pair of spec.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      const value = escapeHtml(t(key));
      const re = new RegExp(`\\s${attr}="[^"]*"`);
      rest = re.test(rest) ? rest.replace(re, ` ${attr}="${value}"`) : `${rest} ${attr}="${value}"`;
    }
    return `<${tag}${rest}>`;
  });
  return html;
}

let stale = 0;
for (const file of readdirSync(root).filter((f) => f.endsWith(".html")).sort()) {
  const path = join(root, file);
  const src = readFileSync(path, "utf8");
  const page = src.match(/<body[^>]*data-page="([^"]+)"/)?.[1];
  if (!page) continue;
  const out = fillTranslations(expandBlocks(src, { page, file }));
  if (out !== src) {
    if (check) {
      console.error(`Non aggiornato: ${file} (esegui node tools/build.js)`);
      stale++;
    } else {
      writeFileSync(path, out);
      console.log(`Aggiornato: ${file}`);
    }
  }
}
if (check && stale) process.exit(1);
if (check) console.log("Tutte le pagine sono aggiornate.");
