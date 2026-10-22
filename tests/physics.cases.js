// Casi di test fisici (criteri di accettazione, SPEC sez. 8.5).
// Eseguiti da Node (tests/physics.test.js) e dal browser (tests/physics.test.html).
import { FixedStepLoop, DEFAULT_DT } from "../assets/js/sim/engine.js";
import { createInertiaModel, INERTIA_DEFAULTS } from "../assets/js/sim/sim-inertia.js";
import { createForceModel, FORCE_DEFAULTS, netForce } from "../assets/js/sim/sim-force.js";
import { createSkatersModel, SKATERS_DEFAULTS, createRocketModel, ROCKET_DEFAULTS } from "../assets/js/sim/sim-reaction.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Simula `seconds` di tempo reale a `hz` frame al secondo attraverso il loop a passo fisso. */
function runAtFrameRate(model, seconds, hz) {
  const loop = new FixedStepLoop((dt) => model.step(dt), DEFAULT_DT);
  const frames = Math.round(seconds * hz);
  for (let i = 0; i < frames; i++) loop.advance(1 / hz);
  return loop;
}

export const cases = [
  {
    name: "Inerzia, μ = 0: |v(t) − v0| < 1e-9 dopo 60 s simulati",
    run() {
      const m = createInertiaModel({ ...INERTIA_DEFAULTS, mu: 0, mass: 2, impulse: 6 });
      const v0 = m.push();
      runAtFrameRate(m, 60, 60);
      for (const lane of m.state.lanes) {
        assert(Math.abs(lane.v - v0) < 1e-9, `v = ${lane.v}, atteso ${v0}`);
        assert(lane.force === 0, "con μ = 0 la forza risultante deve essere nulla");
      }
      assert(Math.abs(m.state.t - 60) < 1e-6, `t = ${m.state.t}`);
    },
  },
  {
    name: "Inerzia con attrito: il carrello si ferma alla distanza v0²/(2μg)",
    run() {
      const m = createInertiaModel({ ...INERTIA_DEFAULTS, mu: 0.2, mass: 2, impulse: 6 });
      const v0 = m.push();
      runAtFrameRate(m, 10, 60);
      const lane = m.state.lanes[0];
      const expected = (v0 * v0) / (2 * 0.2 * 9.81);
      assert(lane.v === 0, "il carrello deve essere fermo");
      assert(Math.abs(lane.x - expected) < 0.02, `x = ${lane.x}, atteso ≈ ${expected}`);
    },
  },
  {
    name: "Seconda legge: F = 10 N, m = 2 kg → a misurata = 5,00 ± 0,01 m/s²",
    run() {
      const m = createForceModel({ ...FORCE_DEFAULTS, force: 10, mass: 2, friction: false, trackLength: 1000 });
      runAtFrameRate(m, 3, 60);
      const a = m.measuredAcceleration();
      assert(Math.abs(a - 5) <= 0.01, `a = ${a}`);
    },
  },
  {
    name: "Seconda legge con attrito statico: spinta debole, nessun movimento",
    run() {
      // μ·m·g = 0,1·5·9,81 ≈ 4,9 N > 4 N
      assert(netForce(4, 0, 5, true, 0.1) === 0, "la forza risultante deve essere 0");
      const m = createForceModel({ ...FORCE_DEFAULTS, force: 4, mass: 5, friction: true });
      runAtFrameRate(m, 2, 60);
      assert(m.state.v === 0 && m.state.x === 0, `v = ${m.state.v}`);
    },
  },
  {
    name: "Terza legge, pattinatori: quantità di moto totale costante (entro 1e-6 relativo)",
    run() {
      const m = createSkatersModel({ ...SKATERS_DEFAULTS, massA: 80, massB: 35, halfWidth: 1e6 });
      m.push();
      runAtFrameRate(m, 5, 60);
      const p = m.momentum();
      const scale = SKATERS_DEFAULTS.force * SKATERS_DEFAULTS.pushTime; // impulso della spinta
      assert(Math.abs(p) / scale < 1e-6, `p totale = ${p}`);
      const ratio = m.state.A.v / m.state.B.v;
      assert(Math.abs(ratio + 35 / 80) < 1e-9, `vA/vB = ${ratio}, atteso ${-35 / 80}`);
      assert(Math.abs(m.state.B.v - scale / 35) < 1e-9, "Δv di B = impulso / mB");
    },
  },
  {
    name: "Terza legge, razzo: quantità di moto razzo + gas costante (entro 1e-6 relativo)",
    run() {
      const m = createRocketModel({ ...ROCKET_DEFAULTS });
      m.ignite();
      runAtFrameRate(m, 15, 60);
      const ref = m.state.gasMass * ROCKET_DEFAULTS.exhaustSpeed;
      assert(m.state.fuel === 0, "il carburante deve essere esaurito");
      assert(Math.abs(m.momentum()) / ref < 1e-6, `p totale = ${m.momentum()}`);
      // equazione del razzo di Ciolkovskij: Δv = u·ln(m0/m1)
      const p = ROCKET_DEFAULTS;
      const expected = p.exhaustSpeed * Math.log((p.dryMass + p.fuel) / p.dryMass);
      assert(Math.abs(m.state.v - expected) / expected < 1e-3, `v = ${m.state.v}, atteso ≈ ${expected}`);
    },
  },
  {
    name: "Indipendenza dal frame rate: stesso stato a 30, 60 e 144 Hz",
    run() {
      const results = [30, 60, 144].map((hz) => {
        const m = createForceModel({ ...FORCE_DEFAULTS, force: 17, mass: 3, friction: true, trackLength: 1000 });
        runAtFrameRate(m, 2, hz);
        return m.state;
      });
      for (const s of results.slice(1)) {
        assert(Math.abs(s.x - results[0].x) < 1e-9 && Math.abs(s.v - results[0].v) < 1e-9, `x: ${results.map((r) => r.x).join(" / ")}`);
      }
      const inertia = [30, 60, 144].map((hz) => {
        const m = createInertiaModel({ ...INERTIA_DEFAULTS, mu: 0.15 });
        m.push();
        runAtFrameRate(m, 4, hz);
        return m.state.lanes[0].x;
      });
      assert(inertia.every((x) => Math.abs(x - inertia[0]) < 1e-9), `x: ${inertia.join(" / ")}`);
    },
  },
];
