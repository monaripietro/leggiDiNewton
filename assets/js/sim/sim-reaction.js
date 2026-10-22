// Fisica della Simulazione 3 — Terza legge ("Pattini e Razzo").


// ---------- Scena A: due pattinatori ----------
// Durante il contatto A spinge B con +F e B spinge A con −F (stessa intensità, verso opposto,
// su corpi diversi). Dopo la spinta il ghiaccio (senza attrito) lascia scivolare entrambi.
// La quantità di moto totale resta zero: mA·vA + mB·vB = 0  →  vA / vB = −mB / mA.

export const SKATERS_DEFAULTS = Object.freeze({ massA: 60, massB: 40, force: 300, pushTime: 0.4, halfWidth: 6 });

export function createSkatersModel(params = { ...SKATERS_DEFAULTS }) {
  const model = {
    params,
    state: null,
    reset() {
      model.state = { t: 0, phase: "ready", pushStart: 0, A: { x: -0.4, v: 0 }, B: { x: 0.4, v: 0 }, forceOnB: 0, ended: false };
    },
    push() {
      if (model.state.phase !== "ready") return false;
      model.state.phase = "pushing";
      model.state.pushStart = model.state.t;
      return true;
    },
    step(dt) {
      const s = model.state;
      const p = model.params;
      const events = [];
      if (s.ended) return events;
      s.t += dt;
      if (s.phase === "pushing") {
        const remaining = p.pushTime - (s.t - dt - s.pushStart);
        const h = Math.min(dt, Math.max(remaining, 0));
        // impulso uguale e opposto sui due corpi nello stesso intervallo h
        s.B.v += (p.force / p.massB) * h;
        s.A.v -= (p.force / p.massA) * h;
        s.forceOnB = p.force;
        if (remaining <= dt) {
          s.phase = "gliding";
          s.forceOnB = 0;
          events.push({ type: "released", vA: s.A.v, vB: s.B.v });
        }
      }
      s.A.x += s.A.v * dt;
      s.B.x += s.B.v * dt;
      if (Math.abs(s.A.x) >= p.halfWidth || Math.abs(s.B.x) >= p.halfWidth) {
        s.ended = true;
        events.push({ type: "end" });
      }
      return events;
    },
    momentum() {
      const s = model.state;
      return model.params.massA * s.A.v + model.params.massB * s.B.v;
    },
  };
  model.reset();
  return model;
}

// ---------- Scena B: razzo nello spazio ----------
// Il motore espelle gas verso sinistra a velocità u (rispetto al razzo). Il razzo spinge il gas
// all'indietro e il gas spinge il razzo in avanti: non serve aria su cui "appoggiarsi".
// Conservazione della quantità di moto su un passo in cui esce la massa dm:
//   m·v = (m − dm)·v' + dm·(v − u)   →   v' = v + dm·u / (m − dm)
// Spinta media = portata · u.

export const ROCKET_DEFAULTS = Object.freeze({ flow: 2, dryMass: 30, fuel: 20, exhaustSpeed: 40 });

export function createRocketModel(params = { ...ROCKET_DEFAULTS }) {
  const model = {
    params,
    state: null,
    reset(p = model.params) {
      model.state = { t: 0, x: 0, v: 0, fuel: p.fuel, mass: p.dryMass + p.fuel, gasMomentum: 0, gasMass: 0, burning: false, thrust: 0, particles: [] };
    },
    ignite() {
      if (model.state.fuel > 0) model.state.burning = true;
    },
    step(dt) {
      const s = model.state;
      const p = model.params;
      const events = [];
      s.t += dt;
      s.thrust = 0;
      if (s.burning && s.fuel > 0) {
        const dm = Math.min(p.flow * dt, s.fuel);
        const gasVelocity = s.v - p.exhaustSpeed;
        s.v += (dm * p.exhaustSpeed) / (s.mass - dm);
        s.mass -= dm;
        s.fuel -= dm;
        s.gasMomentum += dm * gasVelocity;
        s.gasMass += dm;
        s.thrust = (dm * p.exhaustSpeed) / dt;
        if (s.particles.length < 160 && Math.random() < 0.5) {
          s.particles.push({ x: s.x - 0.6, v: gasVelocity * (0.85 + Math.random() * 0.3), y: (Math.random() - 0.5) * 0.4, life: 1 });
        }
        if (s.fuel <= 1e-12) {
          s.fuel = 0;
          s.burning = false;
          events.push({ type: "burnout", v: s.v });
        }
      }
      s.x += s.v * dt;
      for (const g of s.particles) {
        g.x += g.v * dt;
        g.life -= dt * 0.8;
      }
      s.particles = s.particles.filter((g) => g.life > 0);
      return events;
    },
    /** Quantità di moto totale razzo + gas espulso (deve restare 0). */
    momentum() {
      return model.state.mass * model.state.v + model.state.gasMomentum;
    },
    onParam(name) {
      if (name === "dryMass" && model.state.t === 0) model.reset();
    },
  };
  model.reset(params);
  return model;
}

