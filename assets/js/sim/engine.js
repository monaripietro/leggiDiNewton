// Motore comune delle simulazioni.
// - FixedStepLoop: integrazione a passo fisso con accumulatore, indipendente dal frame rate (puro, testabile in Node).
// - createSimulation: collega un modello fisico al rendering con requestAnimationFrame,
//   espone start/pause/reset/step/setParam/getState/on/destroy e si mette in pausa se la scheda è nascosta.

export const DEFAULT_DT = 1 / 120; // s

/**
 * Avanza un modello a passo fisso. Il tempo reale trascorso tra due frame viene accumulato
 * e consumato in passi da `dt`: lo stato fisico non dipende da quanti frame al secondo disegniamo.
 */
export class FixedStepLoop {
  constructor(stepFn, dt = DEFAULT_DT, maxFrame = 0.25) {
    this.stepFn = stepFn;
    this.dt = dt;
    this.maxFrame = maxFrame; // evita la "spirale della morte" dopo una lunga pausa
    this.accumulator = 0;
    this.steps = 0;
  }
  /** @param {number} frameTime secondi reali trascorsi dall'ultimo frame */
  advance(frameTime) {
    this.accumulator += Math.min(frameTime, this.maxFrame);
    // Tolleranza per l'arrotondamento: 1/30 s deve valere esattamente 4 passi da 1/120 s.
    const eps = 1e-9;
    let n = 0;
    while (this.accumulator + eps >= this.dt) {
      this.stepFn(this.dt);
      this.accumulator -= this.dt;
      this.steps++;
      n++;
    }
    if (this.accumulator < 0) this.accumulator = 0;
    return n;
  }
  reset() {
    this.accumulator = 0;
    this.steps = 0;
  }
}

/**
 * @param {object} opts
 * @param {object} opts.model  { params, reset(params), step(dt, params), state } — fisica pura
 * @param {(state, params) => void} opts.render
 * @param {number} [opts.dt]
 */
export function createSimulation({ model, render, dt = DEFAULT_DT }) {
  const listeners = {};
  let running = false;
  let rafId = 0;
  let lastTime = 0;
  let pausedByVisibility = false;

  const emit = (name, data) => (listeners[name] || []).forEach((cb) => cb(data));
  const loop = new FixedStepLoop((h) => {
    const events = model.step(h) || [];
    for (const ev of events) emit(ev.type, ev);
  }, dt);

  function frame(now) {
    if (!running) return;
    const elapsed = lastTime ? (now - lastTime) / 1000 : 0;
    lastTime = now;
    loop.advance(elapsed);
    render(model.state, model.params);
    emit("tick", model.state);
    rafId = requestAnimationFrame(frame);
  }

  function onVisibility() {
    if (document.hidden && running) {
      pausedByVisibility = true;
      api.pause();
    } else if (!document.hidden && pausedByVisibility) {
      pausedByVisibility = false;
      api.start();
    }
  }
  document.addEventListener("visibilitychange", onVisibility);

  const api = {
    get running() {
      return running;
    },
    start() {
      if (running) return;
      running = true;
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
      emit("statechange", { running });
    },
    pause() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
      emit("statechange", { running });
    },
    /** Un singolo passo da 1/20 s (6 passi fisici), utile in pausa e con reduced-motion. */
    step(seconds = 0.05) {
      api.pause();
      const n = Math.round(seconds / dt);
      for (let i = 0; i < n; i++) loop.stepFn(dt);
      render(model.state, model.params);
      emit("tick", model.state);
    },
    reset() {
      loop.reset();
      model.reset(model.params);
      render(model.state, model.params);
      emit("reset", model.state);
      emit("tick", model.state);
    },
    setParam(name, value) {
      model.params[name] = value;
      if (model.onParam) model.onParam(name, value);
      if (!running) render(model.state, model.params);
      emit("param", { name, value });
    },
    getState() {
      return model.state;
    },
    redraw() {
      render(model.state, model.params);
    },
    on(name, cb) {
      (listeners[name] ||= []).push(cb);
      return api;
    },
    destroy() {
      api.pause();
      document.removeEventListener("visibilitychange", onVisibility);
      for (const k of Object.keys(listeners)) delete listeners[k];
    },
  };
  return api;
}

/** Inizializza `init()` solo quando l'elemento entra nel viewport (prestazioni). */
export function whenVisible(el, init) {
  if (!("IntersectionObserver" in window)) {
    init();
    return;
  }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      init();
    }
  }, { rootMargin: "200px" });
  io.observe(el);
}
