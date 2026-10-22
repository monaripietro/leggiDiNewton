// Toggle tema chiaro/scuro. Senza scelta esplicita vale prefers-color-scheme.
import { t } from "./i18n.js";
import { announce } from "./a11y.js";

const STORAGE_KEY = "nim-theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");

export function isDark() {
  const explicit = document.documentElement.dataset.theme;
  return explicit ? explicit === "dark" : media.matches;
}

function updateButton(btn) {
  btn.setAttribute("aria-pressed", String(isDark()));
  const label = btn.querySelector("[data-theme-label]");
  if (label) label.textContent = t("common.theme.dark");
}

export function initTheme() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  updateButton(btn);
  btn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignora */
    }
    updateButton(btn);
    announce(t(next === "dark" ? "common.theme.nowDark" : "common.theme.nowLight"));
    document.dispatchEvent(new CustomEvent("themechange"));
  });
  media.addEventListener("change", () => {
    updateButton(btn);
    document.dispatchEvent(new CustomEvent("themechange"));
  });
  document.addEventListener("langchange", () => updateButton(btn));
}
