// Utilità di accessibilità: annunci per screen reader, preferenze di movimento, throttling.

let region;

/** Annuncio "polite" in una regione live globale (creata al primo uso). */
export function announce(message) {
  if (!region) {
    region = document.createElement("div");
    region.className = "visually-hidden";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    document.body.append(region);
  }
  // Svuota e riscrive per far ripetere anche messaggi identici.
  region.textContent = "";
  setTimeout(() => {
    region.textContent = message;
  }, 50);
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Aggiorna un elemento aria-live al massimo una volta ogni `interval` ms.
 * `now(text)` scrive subito (eventi chiave), `soon(text)` rispetta il limite.
 */
export function createLiveText(el, interval = 1000) {
  let lastWrite = 0;
  let pending = null;
  let timer = null;
  const write = (text) => {
    if (el.textContent !== text) el.textContent = text;
    lastWrite = performance.now();
  };
  return {
    now(text) {
      clearTimeout(timer);
      timer = null;
      pending = null;
      write(text);
    },
    soon(text) {
      const elapsed = performance.now() - lastWrite;
      if (elapsed >= interval) {
        write(text);
      } else {
        pending = text;
        if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            if (pending !== null) write(pending);
            pending = null;
          }, interval - elapsed);
        }
      }
    },
  };
}
