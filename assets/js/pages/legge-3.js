// Pagina Legge 3: scena A "Due pattinatori" e scena B "Razzo nello spazio".
import { ready } from "../nav.js";
import { t, fmt } from "../i18n.js";
import { createLiveText } from "../a11y.js";
import { initQuestions, initPredictions } from "../quiz.js";
import { createSimulation, whenVisible } from "../sim/engine.js";
import { createSkatersModel, SKATERS_DEFAULTS, createRocketModel, ROCKET_DEFAULTS } from "../sim/sim-reaction.js";
import { setupCanvas, readColors, drawArrow, drawGraphAt, Series, roundRectPath } from "../sim/canvas-utils.js";
import { setupPlayback, bindRange, fillTable, writeReadout, markUsed, unit } from "../sim/sim-ui.js";

await ready;
initPredictions();
initQuestions();

const root = document.getElementById("sim-reaction");
whenVisible(root, () => mount(root));

function mount(root) {
  const models = { A: createSkatersModel({ ...SKATERS_DEFAULTS }), B: createRocketModel({ ...ROCKET_DEFAULTS }) };
  let scene = "A";
  // Un solo motore: il "modello di scena" inoltra le chiamate al modello attivo.
  const model = {
    get params() {
      return models[scene].params;
    },
    get state() {
      return models[scene].state;
    },
    reset: () => models[scene].reset(),
    step: (dt) => models[scene].step(dt),
    onParam: (name, value) => models[scene].onParam?.(name, value),
  };

  const canvas = root.querySelector("canvas");
  const live = createLiveText(root.querySelector('[data-role="live"]'));
  const series = { va: new Series(), vb: new Series(), vr: new Series() };
  const rows = { A: [], B: [] };
  let colors = readColors();
  let layout = {};
  let sim = null;
  let lastSample = -1;
  let lastRow = -1;

  const { ctx, size } = setupCanvas(canvas, (w) => (w < 560 ? 0.8 : 1.5), (w, h) => {
    layout = { sceneH: Math.round(h * 0.55), pxPerM: (w - 40) / (2 * SKATERS_DEFAULTS.halfWidth), pxPerN: w / 900, pxPerMs: w / 40, rocketPxPerM: w / 60 };
    updateScaleLegend();
    sim?.redraw();
  });

  function updateScaleLegend() {
    const ref = scene === "A" ? 100 : 50;
    root.querySelector('[data-role="scale-f"]').textContent = t("common.sim.scale", { px: Math.round(ref * layout.pxPerN * (scene === "A" ? 1 : 3)), value: ref, unit: "N" });
  }

  // ---------- disegno scena A ----------
  function drawSkater(x, y, mass, label, color) {
    const s = 0.55 + mass / 120; // figura più grande per masse maggiori
    ctx.fillStyle = color;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRectPath(ctx, x - 14 * s, y - 70 * s, 28 * s, 48 * s, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - 84 * s, 13 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, y - 22 * s);
    ctx.lineTo(x - 8 * s, y - 4);
    ctx.moveTo(x + 6 * s, y - 22 * s);
    ctx.lineTo(x + 8 * s, y - 4);
    ctx.stroke();
    // pattini
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 18 * s, y - 2);
    ctx.lineTo(x + 18 * s, y - 2);
    ctx.stroke();
    ctx.fillStyle = colors.ink;
    ctx.font = `700 16px ${colors.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y - 84 * s - 13 * s - 14);
    return 14 * s;
  }

  function renderA(state, params) {
    const w = size.width;
    const { sceneH, pxPerM, pxPerN, pxPerMs } = layout;
    const y = sceneH - 30;
    const X = (m) => w / 2 + m * pxPerM;
    ctx.fillStyle = colors.sky;
    ctx.fillRect(0, y, w, 10);
    ctx.strokeStyle = colors.ground;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    const halfA = drawSkater(X(state.A.x), y, params.massA, `${t("law3.sim.labelA")} · ${fmt(params.massA, 0)} kg`, colors.mint);
    const halfB = drawSkater(X(state.B.x), y, params.massB, `${t("law3.sim.labelB")} · ${fmt(params.massB, 0)} kg`, colors.lavender);
    if (state.forceOnB > 0) {
      // ciascuna forza è disegnata sul corpo che la riceve
      const len = state.forceOnB * pxPerN;
      drawArrow(ctx, X(state.B.x) + halfB, y - 40, len, 0, { color: colors.vecF, label: t("law3.sim.forceOnB"), dash: [8, 5], font: colors.font, labelOffset: -16 });
      drawArrow(ctx, X(state.A.x) - halfA, y - 40, -len, 0, { color: colors.vecF, label: t("law3.sim.forceOnA"), dash: [8, 5], font: colors.font, labelOffset: -16 });
    }
    drawArrow(ctx, X(state.A.x), y - 150, state.A.v * pxPerMs, 0, { color: colors.vecV, label: "v", font: colors.font });
    drawArrow(ctx, X(state.B.x), y - 150, state.B.v * pxPerMs, 0, { color: colors.vecV, label: "v", font: colors.font });
  }

  // ---------- disegno scena B ----------
  function renderB(state, params) {
    const w = size.width;
    const { sceneH, rocketPxPerM, pxPerN } = layout;
    const camX = state.x; // la telecamera segue il razzo
    const rx = w * 0.45;
    const y = sceneH / 2 + 10;
    const X = (m) => rx + (m - camX) * rocketPxPerM;
    // riferimenti fissi nello spazio, ogni 10 m: mostrano che il razzo si muove
    ctx.fillStyle = colors.inkSoft;
    ctx.strokeStyle = colors.line;
    ctx.font = `12px ${colors.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const first = Math.floor((camX - rx / rocketPxPerM) / 10) * 10;
    for (let m = first; X(m) < w; m += 10) {
      ctx.beginPath();
      ctx.moveTo(X(m), 18);
      ctx.lineTo(X(m), sceneH - 22);
      ctx.stroke();
      ctx.fillText(`${m} m`, X(m), sceneH - 18);
    }
    // gas espulso
    ctx.fillStyle = colors.vecF;
    for (const g of state.particles) {
      ctx.globalAlpha = Math.max(0, g.life) * 0.7;
      ctx.beginPath();
      ctx.arc(X(g.x), y + g.y * rocketPxPerM * 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // razzo
    ctx.fillStyle = colors.surface;
    ctx.strokeStyle = colors.body;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rx + 46, y);
    ctx.lineTo(rx + 20, y - 16);
    ctx.lineTo(rx - 30, y - 16);
    ctx.lineTo(rx - 40, y - 26);
    ctx.lineTo(rx - 40, y + 26);
    ctx.lineTo(rx - 30, y + 16);
    ctx.lineTo(rx + 20, y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // barra del carburante
    const frac = state.fuel / params.fuel;
    ctx.fillStyle = colors.lemon;
    ctx.fillRect(rx - 24, y - 7, 40 * frac, 14);
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1;
    ctx.strokeRect(rx - 24, y - 7, 40, 14);
    if (state.thrust > 0) {
      const len = state.thrust * pxPerN * 3;
      drawArrow(ctx, rx + 50, y - 34, len, 0, { color: colors.vecF, label: t("law3.sim.forceOnRocket"), dash: [8, 5], font: colors.font, labelOffset: -16 });
      drawArrow(ctx, rx - 46, y + 40, -len, 0, { color: colors.vecF, label: t("law3.sim.forceOnGas"), dash: [8, 5], font: colors.font, labelOffset: 16 });
    }
    drawArrow(ctx, rx, y - 70, state.v * layout.pxPerMs * 0.5, 0, { color: colors.vecV, label: "v", font: colors.font });
  }

  function render(state, params) {
    const w = size.width;
    const h = size.height;
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);
    if (scene === "A") renderA(state, params);
    else renderB(state, params);
    const gy = layout.sceneH + 4;
    const data = scene === "A"
      ? [{ data: series.va, color: colors.vecV, dash: [6, 4] }, { data: series.vb, color: colors.vecA }]
      : [{ data: series.vr, color: colors.vecV }];
    const all = data.flatMap((d) => d.data.points.map((p) => p[1]));
    drawGraphAt(ctx, 6, gy, w - 12, h - gy - 6, {
      colors,
      title: scene === "A" ? `${t("law3.sim.rVA")} (- -) / ${t("law3.sim.rVB")} (—)` : t("law3.sim.graphB"),
      xLabel: t("common.sim.time"),
      yLabel: t("law3.sim.graphVY"),
      yMin: Math.min(-1, ...all) * 1.1,
      yMax: Math.max(1, ...all) * 1.1,
      tWindow: scene === "A" ? 6 : 14,
      series: data,
    });
  }

  sim = createSimulation({ model, render });

  // ---------- descrizioni ----------
  function describe() {
    if (scene === "A") {
      const s = models.A.state;
      const p = models.A.params;
      writeReadout(root, {
        fa: unit(-s.forceOnB, 0, "N"),
        fb: unit(s.forceOnB, 0, "N"),
        va: unit(s.A.v, 2, "m/s"),
        vb: unit(s.B.v, 2, "m/s"),
        p: unit(models.A.momentum(), 2, "kg·m/s"),
      });
      if (s.phase === "ready") return t("law3.sim.readyA", { mA: fmt(p.massA, 0), mB: fmt(p.massB, 0) });
      if (s.phase === "pushing") return t("law3.sim.pushing", { f: fmt(p.force, 0) });
      if (s.ended) return t("law3.sim.endA", { ratio: fmt(Math.abs(s.A.v / s.B.v), 2) });
      return t("law3.sim.released", { vA: fmt(Math.abs(s.A.v), 2), vB: fmt(s.B.v, 2) });
    }
    const s = models.B.state;
    const p = models.B.params;
    writeReadout(root, {
      thrust: unit(s.thrust, 0, "N"),
      vr: unit(s.v, 2, "m/s"),
      mass: unit(s.mass, 1, "kg"),
      fuel: unit(s.fuel, 1, "kg"),
      pr: unit(models.B.momentum(), 2, "kg·m/s"),
    });
    if (!s.burning && s.fuel > 0) return t("law3.sim.readyB", { m: fmt(s.mass, 0), fuel: fmt(p.fuel, 0) });
    if (s.burning) return t("law3.sim.burning", { f: fmt(s.thrust, 0), v: fmt(s.v, 2) });
    return t("law3.sim.burnout", { v: fmt(s.v, 2) });
  }

  const showTable = () => {
    const fmtRow = (r) => [fmt(r[0], 2), fmt(r[1], 2), fmt(r[2], scene === "A" ? 2 : 1), fmt(r[3], 2)];
    fillTable(root.querySelector('[data-role="table-A"]'), rows.A.map(fmtRow), undefined, 4);
    fillTable(root.querySelector('[data-role="table-B"]'), rows.B.map(fmtRow), undefined, 4);
  };

  sim.on("tick", (s) => {
    if (s.t - lastSample >= 1 / 20) {
      if (scene === "A") {
        series.va.push(s.t, s.A.v);
        series.vb.push(s.t, s.B.v);
      } else series.vr.push(s.t, s.v);
      lastSample = s.t;
    }
    const active = scene === "A" ? s.phase !== "ready" : s.burning || s.v !== 0;
    if (active && s.t - lastRow >= 0.25) {
      if (scene === "A") rows.A.push([s.t, s.A.v, s.B.v, models.A.momentum()]);
      else rows.B.push([s.t, s.v, s.mass, models.B.momentum()]);
      for (const k of ["A", "B"]) if (rows[k].length > 16) rows[k].shift();
      showTable();
      lastRow = s.t;
    }
    live.soon(describe());
  });
  for (const ev of ["released", "burnout"]) sim.on(ev, () => live.now(describe()));
  sim.on("end", () => {
    sim.pause();
    live.now(describe());
  });
  sim.on("reset", () => {
    series.va.clear();
    series.vb.clear();
    series.vr.clear();
    rows[scene].length = 0;
    lastSample = -1;
    lastRow = -1;
    showTable();
    live.now(describe());
  });

  // ---------- controlli ----------
  root.querySelector('[data-action="push"]').addEventListener("click", () => {
    if (models.A.state.phase !== "ready") sim.reset();
    models.A.push();
    lastRow = models.A.state.t - 0.25;
    sim.start();
    markUsed();
    live.now(describe());
  });
  root.querySelector('[data-action="ignite"]').addEventListener("click", () => {
    if (models.B.state.fuel <= 0) sim.reset();
    models.B.ignite();
    lastRow = models.B.state.t - 0.25;
    sim.start();
    markUsed();
    live.now(describe());
  });

  const resetIfIdle = () => {
    sim.pause();
    sim.reset();
  };
  bindRange(root.querySelector("#l3-ma"), { format: (v) => unit(v, 0, "kg"), onInput: (v) => { sim.setParam("massA", v); resetIfIdle(); } });
  bindRange(root.querySelector("#l3-mb"), { format: (v) => unit(v, 0, "kg"), onInput: (v) => { sim.setParam("massB", v); resetIfIdle(); } });
  bindRange(root.querySelector("#l3-flow"), { format: (v) => unit(v, 1, "kg/s"), onInput: (v) => sim.setParam("flow", v) });
  bindRange(root.querySelector("#l3-dry"), { format: (v) => unit(v, 0, "kg"), onInput: (v) => { sim.setParam("dryMass", v); resetIfIdle(); } });
  root.querySelector('[data-role="controls"]').addEventListener("submit", (e) => e.preventDefault());

  const sceneButtons = [...root.querySelectorAll("[data-scene]")];
  function setScene(next) {
    sim.pause();
    scene = next;
    sceneButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scene === scene)));
    root.querySelectorAll("[data-scene-only]").forEach((el) => (el.hidden = el.dataset.sceneOnly !== scene));
    canvas.dataset.i18nAttr = `aria-label:law3.sim.canvasLabel${scene}`;
    canvas.setAttribute("aria-label", t(`law3.sim.canvasLabel${scene}`));
    sim.reset();
    updateScaleLegend();
  }
  sceneButtons.forEach((b) => b.addEventListener("click", () => setScene(b.dataset.scene)));

  document.addEventListener("themechange", () => {
    colors = readColors();
    sim.redraw();
  });
  document.addEventListener("langchange", () => {
    updateScaleLegend();
    showTable();
    live.now(describe());
    sim.redraw();
  });

  setupPlayback(root, sim, {
    autoStart: true,
    // nella scena A "Avvia" equivale a "Spingi!": riparte da capo se i pattinatori sono al bordo
    onBeforeStart: () => {
      if (scene !== "A") return;
      if (models.A.state.ended) sim.reset();
      if (models.A.state.phase === "ready") {
        models.A.push();
        lastRow = models.A.state.t - 0.25;
      }
    },
  });
  showTable();
  live.now(describe());
  sim.redraw();
}
