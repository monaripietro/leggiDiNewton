// Fisica della Simulazione 1 — Inerzia ("Il carrello sul ghiaccio").
// Nessuna forza applicata dopo la spinta: l'unica forza orizzontale è l'attrito dinamico
//   F_attrito = −μ·m·g·segno(v)   (solo mentre il carrello si muove)
// quindi a = −μ·g·segno(v). Con μ = 0 la forza risultante è nulla e la velocità resta costante.
import { G, sign } from "./vec.js";

export const INERTIA_DEFAULTS = Object.freeze({ impulse: 6, mu: 0.1, mass: 2, compare: true });

/** Forza di attrito dinamico (N) su un carrello di massa m che si muove a velocità v. */
export function frictionForce(v, mu, mass) {
  return v === 0 ? 0 : -sign(v) * mu * mass * G;
}

/**
 * Un passo di Eulero semi-implicito per una corsia.
 * Se l'attrito invertirebbe il verso del moto, il carrello si ferma (l'attrito non fa ripartire all'indietro).
 * @returns {boolean} true se il carrello si è appena fermato
 */
export function stepLane(lane, mass, dt) {
  if (lane.v === 0) {
    lane.force = 0;
    return false;
  }
  lane.force = frictionForce(lane.v, lane.mu, mass);
  const a = lane.force / mass;
  const vNew = lane.v + a * dt;
  if (sign(vNew) !== sign(lane.v)) {
    // si ferma durante il passo: avanza solo fino all'arresto
    const tStop = -lane.v / a;
    lane.x += lane.v * tStop + 0.5 * a * tStop * tStop;
    lane.v = 0;
    lane.force = 0;
    return true;
  }
  lane.v = vNew;
  lane.x += lane.v * dt;
  return false;
}

export function createInertiaModel(params = { ...INERTIA_DEFAULTS }) {
  const model = {
    params,
    state: null,
    reset(p = model.params) {
      model.state = {
        t: 0,
        pushes: 0,
        lanes: [
          { id: "main", x: 0, v: 0, mu: p.mu, force: 0 },
          { id: "frictionless", x: 0, v: 0, mu: 0, force: 0 },
        ],
      };
    },
    /** Applica la spinta (impulso J, in N·s): Δv = J / m, a entrambe le corsie. */
    push() {
      const dv = model.params.impulse / model.params.mass;
      for (const lane of model.state.lanes) lane.v += dv;
      model.state.pushes++;
      return dv;
    },
    step(dt) {
      const s = model.state;
      const events = [];
      s.t += dt;
      for (const lane of s.lanes) {
        if (stepLane(lane, model.params.mass, dt)) events.push({ type: "stopped", lane: lane.id, x: lane.x, t: s.t });
      }
      return events;
    },
    onParam(name, value) {
      if (name === "mu") model.state.lanes[0].mu = value;
    },
  };
  model.reset(params);
  return model;
}
