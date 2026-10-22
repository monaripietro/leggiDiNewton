// Pagina Legge 1: simulazione "Il carrello sul ghiaccio".
import { ready } from "../nav.js";
import { t, fmt } from "../i18n.js";
import { createLiveText } from "../a11y.js";
import { initQuestions, initPredictions } from "../quiz.js";
import { createSimulation, whenVisible } from "../sim/engine.js";
import { createInertiaModel, INERTIA_DEFAULTS } from "../sim/sim-inertia.js";
import { setupCanvas, readColors, drawArrow, drawGraphAt, Series } from "../sim/canvas-utils.js";
import { setupPlayback, bindRange, fillTable, writeReadout, markUsed, unit } from "../sim/sim-ui.js";

await ready;
initPredictions();
initQuestions();

const root = document.getElementById("sim-inertia");
whenVisible(root, () => mount(root));

const TRACK_M = 12; // metri visibili sulla pista (scala costante per tutta la simulazione)

function mount(root) {
  const model = createInertiaModel({ ...INERTIA_DEFAULTS });
  const canvas = root.querySelector("canvas");
  const live = createLiveText(root.querySelector('[data-role="live"]'));
  const tbody = root.querySelector('[data-role="table"]');
  const series = { main: new Series(), free: new Series() };
  const rows = [];
  let colors = readColors();
  let lastSample = -1;
  let lastRow = -1;
  let layout = {};
  let sim = null;

  // Scale dichiarate: px per metro, px per (m/s), px per newton. Ricalcolate solo al ridimensionamento.
  const { ctx, size } = setupCanvas(canvas, (w) => (w < 560 ? 0.8 : 1.45), (w, h) => {
    const sceneH = Math.round(h * 0.6);
    layout = {
      margin: 16,
      sceneH,
      pxPerM: (w - 32) / TRACK_M,
      pxPerMs: w / 25, // px per 1 m/s
      pxPerN: w / 60, // px per 1 N
    };
    updateScaleLegend();
    sim?.redraw();
  });

  function updateScaleLegend() {
    const vRef = 5;
    const fRef = 10;
    root.querySelector('[data-role="scale-v"]').textContent = t("common.sim.scale", { px: Math.round(vRef * layout.pxPerMs), value: vRef, unit: "m/s" });
    root.querySelector('[data-role="scale-f"]').textContent = t("common.sim.scale", { px: Math.round(fRef * layout.pxPerN), value: fRef, unit: "N" });
  }

  function drawLane(lane, y, label) {
    const { margin, pxPerM, pxPerMs, pxPerN } = layout;
    const w = size.width;
    // corsia e tacche ogni metro: si spostano con il carrello per rendere visibile il moto
    ctx.strokeStyle = colors.ground;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(w - margin, y);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let m = 0; m <= TRACK_M; m++) {
      const x = margin + m * pxPerM;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + (m % 5 === 0 ? 10 : 5));
      ctx.stroke();
    }
    ctx.fillStyle = colors.ink;
    ctx.font = `700 14px ${colors.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, margin, y + 14);

    // posizione sulla pista "ad anello": il carrello che esce a destra rientra a sinistra
    const xm = ((lane.x % TRACK_M) + TRACK_M) % TRACK_M;
    const cw = Math.max(40, pxPerM * 0.9);
    const ch = cw * 0.5;
    const cx = margin + xm * pxPerM;
    ctx.fillStyle = colors.surface;
    ctx.strokeStyle = colors.body;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cx - cw / 2, y - ch - 10, cw, ch, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.ink;
    for (const dx of [-cw / 4, cw / 4]) {
      ctx.beginPath();
      ctx.arc(cx + dx, y - 6, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // vettori: velocità (piena) sopra, forza di attrito (tratteggiata) all'altezza del carrello
    drawArrow(ctx, cx, y - ch - 22, lane.v * pxPerMs, 0, { color: colors.vecV, label: "v", font: colors.font });
    // la forza parte dal bordo del carrello dal lato verso cui agisce
    const fx = cx + Math.sign(lane.force) * (cw / 2 + 2);
    drawArrow(ctx, fx, y - ch / 2 - 10, lane.force * pxPerN, 0, { color: colors.vecF, label: "F", dash: [8, 5], font: colors.font });
  }

  function render(state, params) {
    const w = size.width;
    const h = size.height;
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);
    const [main, free] = state.lanes;
    const lanes = params.compare ? 2 : 1;
    const laneGap = layout.sceneH / (lanes + 0.2);
    drawLane(main, laneGap * 0.95, t("law1.sim.laneMain", { mu: fmt(main.mu, 2) }));
    if (params.compare) drawLane(free, laneGap * 1.95, t("law1.sim.laneFree"));

    const vMax = Math.max(4, ...series.main.points.map((p) => p[1]), ...series.free.points.map((p) => p[1]));
    drawGraphAt(ctx, 8, layout.sceneH + 4, w - 16, h - layout.sceneH - 12, {
      colors,
      title: t("law1.sim.graph"),
      xLabel: t("common.sim.time"),
      yLabel: t("law1.sim.graphY"),
      yMin: 0,
      yMax: vMax * 1.1,
      tWindow: 10,
      series: [
        { data: series.main, color: colors.vecV },
        ...(params.compare ? [{ data: series.free, color: colors.inkSoft, dash: [6, 5] }] : []),
      ],
    });
  }

  sim = createSimulation({ model, render });

  // --- descrizione testuale, letture, tabella ---
  function describe() {
    const s = model.state;
    const p = model.params;
    const [main, free] = s.lanes;
    writeReadout(root, {
      v: unit(main.v, 2, "m/s"),
      f: unit(main.force, 2, "N"),
      d: unit(main.x, 2, "m"),
      vfree: unit(free.v, 2, "m/s"),
    });
    if (s.pushes === 0) return t("law1.sim.ready", { m: fmt(p.mass, 1), mu: fmt(main.mu, 2) });
    if (main.v === 0) {
      return p.compare
        ? t("law1.sim.stopped", { d: fmt(main.x, 2), v: fmt(free.v, 2) })
        : t("law1.sim.stoppedAlone", { d: fmt(main.x, 2) });
    }
    if (main.mu === 0) return t("law1.sim.constant", { m: fmt(p.mass, 1), v: fmt(main.v, 2) });
    return t("law1.sim.moving", { m: fmt(p.mass, 1), mu: fmt(main.mu, 2), v: fmt(main.v, 2), f: fmt(main.force, 2) });
  }

  // i dati sono salvati come numeri e formattati solo per la visualizzazione (cambio lingua)
  const showTable = () => fillTable(tbody, rows.map((r) => [fmt(r[0], 1), fmt(r[1], 2), fmt(r[2], 2), fmt(r[3], 2)]), undefined, 4);

  sim.on("tick", (s) => {
    if (s.t - lastSample >= 1 / 20) {
      series.main.push(s.t, s.lanes[0].v);
      series.free.push(s.t, s.lanes[1].v);
      lastSample = s.t;
    }
    if (s.pushes > 0 && s.t - lastRow >= 0.5) {
      rows.push([s.t, s.lanes[0].v, s.lanes[1].v, s.lanes[0].force]);
      if (rows.length > 12) rows.shift();
      showTable();
      lastRow = s.t;
    }
    live.soon(describe());
  });
  sim.on("stopped", (ev) => {
    if (ev.lane === "main") live.now(describe());
  });
  sim.on("reset", () => {
    series.main.clear();
    series.free.clear();
    rows.length = 0;
    lastSample = -1;
    lastRow = -1;
    showTable();
    live.now(describe());
  });

  // --- controlli ---
  const pushBtn = root.querySelector('[data-action="push"]');
  pushBtn.addEventListener("click", () => {
    model.push();
    if (model.state.pushes === 1) lastRow = model.state.t - 0.5; // prima riga subito
    if (!sim.running) sim.start();
    markUsed();
    live.now(t("law1.sim.pushed", { v: fmt(model.state.lanes[0].v, 2) }));
  });

  const presets = [...root.querySelectorAll("[data-mu]")];
  const syncPresets = (mu) => presets.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.mu) === mu)));
  const muRange = bindRange(root.querySelector("#l1-mu"), {
    format: (v) => fmt(v, 2),
    onInput: (v) => {
      sim.setParam("mu", v);
      syncPresets(v);
    },
  });
  presets.forEach((b) =>
    b.addEventListener("click", () => {
      const mu = Number(b.dataset.mu);
      muRange.set(mu);
      sim.setParam("mu", mu);
      syncPresets(mu);
    }),
  );
  syncPresets(model.params.mu);

  bindRange(root.querySelector("#l1-impulse"), { format: (v) => unit(v, 1, "N·s"), onInput: (v) => sim.setParam("impulse", v) });
  bindRange(root.querySelector("#l1-mass"), { format: (v) => unit(v, 1, "kg"), onInput: (v) => sim.setParam("mass", v) });
  const compare = root.querySelector("#l1-compare");
  const freeReadout = root.querySelector('[data-role="free-readout"]');
  compare.addEventListener("change", () => {
    sim.setParam("compare", compare.checked);
    freeReadout.hidden = !compare.checked;
  });
  root.querySelector('[data-role="controls"]').addEventListener("submit", (e) => e.preventDefault());

  document.addEventListener("themechange", () => {
    colors = readColors();
    sim.redraw();
  });
  document.addEventListener("langchange", () => {
    updateScaleLegend();
    live.now(describe());
    showTable();
    sim.redraw();
  });

  setupPlayback(root, sim);
  showTable();
  live.now(describe());
  sim.redraw();
}
