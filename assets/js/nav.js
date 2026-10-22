// Punto di ingresso comune a tutte le pagine: lingua, tema, menu mobile.
import { initI18n, setLang, getLang, t } from "./i18n.js";
import { initTheme } from "./theme.js";
import { announce } from "./a11y.js";

function initMenu() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
      toggle.focus();
    }
  });
}

function initLangSelect() {
  const select = document.getElementById("lang-select");
  if (!select) return;
  select.value = getLang();
  select.addEventListener("change", async () => {
    await setLang(select.value);
    announce(t("common.lang.changed"));
  });
  document.addEventListener("langchange", () => {
    select.value = getLang();
  });
}

function registerServiceWorker() {
  // Offline dopo la prima visita. Il percorso è relativo alla pagina (sito in /<nome-repo>/).
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  navigator.serviceWorker.register("sw.js").catch((err) => console.warn("Service Worker non registrato", err));
}

export const ready = (async () => {
  await initI18n();
  initTheme();
  initMenu();
  initLangSelect();
  registerServiceWorker();
})();
