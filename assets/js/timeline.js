// Linea del tempo: filtro per livello di affidabilità (Documentato / Tradizione / Dibattito).
import { ready } from "./nav.js";
import { t } from "./i18n.js";

await ready;

const filter = document.getElementById("timeline-filter");
const items = [...document.querySelectorAll("#timeline > li")];
const count = document.getElementById("timeline-count");

function apply() {
  const active = new Set([...filter.querySelectorAll("input:checked")].map((i) => i.value));
  let shown = 0;
  for (const li of items) {
    const visible = active.has(li.dataset.badge);
    li.hidden = !visible;
    if (visible) shown++;
  }
  count.textContent = t("history.filterCount", { n: shown, total: items.length });
}

if (filter) {
  filter.hidden = false; // il filtro esiste solo con JavaScript attivo
  filter.addEventListener("change", apply);
  document.addEventListener("langchange", apply);
  apply();
}
