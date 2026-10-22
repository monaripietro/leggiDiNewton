// Internazionalizzazione: caricamento dizionari JSON, traduzione del DOM, formattazione numeri.
// Ordine di scelta della lingua: ?lang= → localStorage → navigator.language → "it".
import { parseRich, isExternal, isSafeHref } from "./richtext.js";

export const SUPPORTED = ["it", "en"];
const DEFAULT_LANG = "it";
const STORAGE_KEY = "nim-lang";

const dictionaries = {};
let current = DEFAULT_LANG;

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage non disponibile: la scelta vale solo per questa pagina */
  }
}

export function detectLang() {
  const fromQuery = new URLSearchParams(location.search).get("lang");
  if (SUPPORTED.includes(fromQuery)) return fromQuery;
  const stored = safeGet(STORAGE_KEY);
  if (SUPPORTED.includes(stored)) return stored;
  const nav = (navigator.language || "").slice(0, 2).toLowerCase();
  return SUPPORTED.includes(nav) ? nav : DEFAULT_LANG;
}

async function load(lang) {
  if (!dictionaries[lang]) {
    const url = new URL(`../i18n/${lang}.json`, import.meta.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Dizionario ${lang} non trovato`);
    dictionaries[lang] = await res.json();
  }
  return dictionaries[lang];
}

function lookup(dict, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

/** Traduce una chiave; {nome} viene sostituito con vars.nome. */
export function t(key, vars = {}) {
  let value = lookup(dictionaries[current], key);
  if (value === undefined) value = lookup(dictionaries[DEFAULT_LANG], key);
  if (typeof value !== "string") return key;
  return value.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/** Restituisce un valore non stringa (array/oggetto) dal dizionario. */
export function tRaw(key) {
  return lookup(dictionaries[current], key) ?? lookup(dictionaries[DEFAULT_LANG], key);
}

export function getLang() {
  return current;
}

/** Formatta un numero secondo la lingua corrente (virgola decimale in italiano). */
export function fmt(value, digits = 1) {
  const v = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value; // evita "-0,0"
  return new Intl.NumberFormat(current, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

/** Inserisce un testo con mini-markup come nodi DOM. */
export function setRich(el, str) {
  el.replaceChildren();
  for (const tok of parseRich(str)) {
    if (tok.type === "text") {
      el.append(tok.text);
    } else if (tok.type === "link") {
      if (!isSafeHref(tok.href)) {
        el.append(tok.text);
        continue;
      }
      const a = document.createElement("a");
      a.href = tok.href;
      a.textContent = tok.text;
      if (isExternal(tok.href)) {
        a.rel = "external noopener noreferrer";
        const hint = document.createElement("small");
        hint.className = "visually-hidden";
        hint.textContent = ` ${t("common.externalLink")}`;
        a.append(hint);
      }
      el.append(a);
    } else {
      const node = document.createElement(tok.type);
      node.textContent = tok.text;
      el.append(node);
    }
  }
}

/** Applica le traduzioni a tutti gli elementi con data-i18n / data-i18n-attr. */
export function applyTranslations(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) setRich(el, t(el.dataset.i18n));
  for (const el of root.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of el.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  }
  const page = document.body.dataset.page;
  if (page && root === document) {
    document.title = t(`${page}.meta.title`);
    document.querySelector('meta[name="description"]')?.setAttribute("content", t(`${page}.meta.description`));
  }
}

/** Cambia lingua senza ricaricare. Emette l'evento "langchange" su document. */
export async function setLang(lang, { persist = true } = {}) {
  if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
  await load(DEFAULT_LANG);
  await load(lang);
  current = lang;
  document.documentElement.lang = lang;
  if (persist) safeSet(STORAGE_KEY, lang);
  applyTranslations();
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

export async function initI18n() {
  const lang = detectLang();
  try {
    await setLang(lang, { persist: false });
  } catch (err) {
    // Senza dizionari resta il testo italiano già presente nell'HTML.
    console.warn(err);
  }
  return current;
}
