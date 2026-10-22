// Collegamento tra simulazione e interfaccia: pulsanti di riproduzione, cursori accessibili, tabelle dati.
import { t, fmt } from "../i18n.js";
import { prefersReducedMotion, announce } from "../a11y.js";

/** Segnala che l'utente ha provato la simulazione (sblocca il confronto con la previsione). */
export function markUsed() {
  document.dispatchEvent(new CustomEvent("sim:used"));
}

/**
 * Pulsanti [data-action="toggle|step|reset"] dentro `root`.
 * Con prefers-reduced-motion la simulazione non parte da sola.
 */
export function setupPlayback(root, sim, { onReset, onBeforeStart, autoStart = true } = {}) {
  const toggle = root.querySelector('[data-action="toggle"]');
  const step = root.querySelector('[data-action="step"]');
  const reset = root.querySelector('[data-action="reset"]');
  const reducedNote = root.querySelector('[data-role="reduced"]');
  let everStarted = false;

  const label = () => {
    if (!toggle) return;
    toggle.textContent = sim.running ? t("common.sim.pause") : everStarted ? t("common.sim.resume") : t("common.sim.play");
  };
  sim.on("statechange", ({ running }) => {
    if (running) everStarted = true;
    label();
  });
  toggle?.addEventListener("click", () => {
    if (sim.running) {
      sim.pause();
      announce(t("common.sim.paused"));
    } else {
      onBeforeStart?.();
      sim.start();
      markUsed();
      announce(t("common.sim.running"));
    }
  });
  step?.addEventListener("click", () => {
    onBeforeStart?.();
    everStarted = true;
    sim.step();
    markUsed();
    label();
  });
  reset?.addEventListener("click", () => {
    sim.reset();
    onReset?.();
    announce(t("common.sim.resetDone"));
  });
  document.addEventListener("langchange", label);

  const reduced = prefersReducedMotion();
  if (reducedNote) reducedNote.hidden = !reduced;
  label();
  if (autoStart && !reduced) sim.start();
  return { refresh: label };
}

/**
 * Collega un <input type="range"> al suo <output> e ad aria-valuetext (valore + unità).
 * `format(value)` restituisce il testo con l'unità, nella lingua corrente.
 */
export function bindRange(input, { format, onInput }) {
  const output = input.closest(".control")?.querySelector("output");
  const update = () => {
    const text = format(Number(input.value));
    input.setAttribute("aria-valuetext", text);
    if (output) output.textContent = text;
  };
  input.addEventListener("input", () => {
    update();
    onInput?.(Number(input.value));
  });
  document.addEventListener("langchange", update);
  update();
  return {
    set(value) {
      input.value = String(value);
      update();
    },
    update,
  };
}

/** Maiusc + freccia sposta il cursore di `bigStep` (in aggiunta al passo nativo). */
export function addShiftStep(input, bigStep) {
  input.addEventListener("keydown", (e) => {
    if (!e.shiftKey) return;
    const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const v = Math.min(Number(input.max), Math.max(Number(input.min), Number(input.value) + dir * bigStep));
    input.value = String(v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Riempie un <tbody> con righe di celle testuali (mai innerHTML). */
export function fillTable(tbody, rows, emptyKey = "common.sim.dataEmpty", columns = 1) {
  tbody.replaceChildren();
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = columns;
    td.textContent = t(emptyKey);
    tr.append(td);
    tbody.append(tr);
    return;
  }
  for (const row of rows) {
    const tr = document.createElement("tr");
    row.forEach((cell, i) => {
      const el = document.createElement(i === 0 ? "th" : "td");
      if (i === 0) el.scope = "row";
      el.textContent = cell;
      tr.append(el);
    });
    tbody.append(tr);
  }
}

/** Scrive i valori nei <dd data-out="..."> del riquadro letture. */
export function writeReadout(root, values) {
  for (const [key, text] of Object.entries(values)) {
    const el = root.querySelector(`[data-out="${key}"]`);
    if (el && el.textContent !== text) el.textContent = text;
  }
}

export const unit = (value, digits, u) => `${fmt(value, digits)} ${u}`;
