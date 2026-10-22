// Mini-markup per i testi tradotti: **grassetto**, *corsivo*, [testo](url).
// Niente annidamento, niente HTML: i testi vengono trasformati in nodi DOM (mai innerHTML).
// Usato sia dal browser (i18n.js) sia da tools/build.js per generare l'HTML di fallback.

const TOKEN = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** @returns {{type:'text'|'strong'|'em'|'link', text:string, href?:string}[]} */
export function parseRich(str) {
  const out = [];
  let last = 0;
  for (const m of str.matchAll(TOKEN)) {
    if (m.index > last) out.push({ type: "text", text: str.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: "strong", text: m[1] });
    else if (m[2] !== undefined) out.push({ type: "em", text: m[2] });
    else out.push({ type: "link", text: m[3], href: m[4] });
    last = m.index + m[0].length;
  }
  if (last < str.length) out.push({ type: "text", text: str.slice(last) });
  return out;
}

export function isExternal(href) {
  return /^https?:\/\//.test(href);
}

/** Link consentiti: relativi al sito oppure https. */
export function isSafeHref(href) {
  return isExternal(href) || /^[\w./#?=&-]+$/.test(href);
}
