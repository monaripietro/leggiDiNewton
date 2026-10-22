// Fisica della Simulazione 2 — Seconda legge ("Spingi il carrello").
// Forma moderna: a = F_risultante / m. La forza risultante è la forza applicata più l'eventuale attrito.
// Attrito: statico finché la forza applicata non supera μ·m·g, poi dinamico (−μ·m·g·segno(v)).
import { G, sign } from "./vec.js";

export const FORCE_DEFAULTS = Object.freeze({ force: 20, dir: 1, mass: 5, friction: false, mu: 0.1, trackLength: 20 });

/** Forza risultante (N) dato lo stato di moto. */
export function netForce(applied, v, mass, friction, mu) {
  if (!friction) return applied;
  const fMax = mu * mass * G;
  if (v === 0) {
    if (Math.abs(applied) <= fMax) return 0; // l'attrito statico equilibra la spinta
    return applied - sign(applied) * fMax;
  }
  return applied - sign(v) * fMax;
}

export function createForceModel(params = { ...FORCE_DEFAULTS }) {
  const model = {
    params,
    state: null,
    reset(p = model.params) {
      model.state = { t: 0, x: p.dir < 0 ? p.trackLength : 0, v: 0, a: 0, net: 0, ended: false, t0: 0, v0: 0 };
    },
    step(dt) {
      const s = model.state;
      const p = model.params;
      if (s.ended) return [];
      const events = [];
      const applied = p.force * p.dir;
      s.net = netForce(applied, s.v, p.mass, p.friction, p.mu);
      s.a = s.net / p.mass;
      let vNew = s.v + s.a * dt;
      // l'attrito dinamico può fermare il carrello, ma non farlo ripartire all'indietro
      if (p.friction && s.v !== 0 && sign(vNew) !== sign(s.v) && Math.abs(applied) <= p.mu * p.mass * G) vNew = 0;
      const xPrev = s.x;
      s.v = vNew;
      s.x += s.v * dt;
      s.t += dt;
      if (p.finish != null && (xPrev - p.finish) * (s.x - p.finish) <= 0 && xPrev !== s.x) {
        events.push({ type: "finish", t: s.t });
      }
      if (s.x >= p.trackLength || s.x <= 0) {
        s.x = Math.min(p.trackLength, Math.max(0, s.x));
        s.ended = true;
        events.push({ type: "end", t: s.t, v: s.v });
      }
      return events;
    },
    /** Accelerazione misurata come Δv/Δt dall'inizio della prova (come in laboratorio). */
    measuredAcceleration() {
      const s = model.state;
      const dt = s.t - s.t0;
      return dt > 0 ? (s.v - s.v0) / dt : 0;
    },
    onParam() {
      // un cambio di parametro a metà prova fa ripartire la misura da qui
      model.state.t0 = model.state.t;
      model.state.v0 = model.state.v;
    },
  };
  model.reset(params);
  return model;
}

/** Accelerazione necessaria per percorrere d metri partendo da fermi in T secondi: d = ½·a·T². */
export function requiredAcceleration(d, T) {
  return (2 * d) / (T * T);
}
