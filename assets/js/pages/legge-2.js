// Pagina Legge 2: simulazione "Spingi il carrello" con tabella degli esperimenti,
// modalità "Scopri la regola" e "Sfida".
import { ready } from "../nav.js";
import { t, fmt, setRich } from "../i18n.js";
import { createLiveText } from "../a11y.js";
import { initQuestions, initPredictions } from "../quiz.js";
import { createSimulation, whenVisible } from "../sim/engine.js";
import { createForceModel, FORCE_DEFAULTS } from "../sim/sim-force.js";
import { setupCanvas, readColors, drawArrow, drawGraphAt, Series, roundRectPath } from "../sim/canvas-utils.js";
import { setupPlayback, bindRange, addShiftStep, fillTable, writeReadout, unit } from "../sim/sim-ui.js";

await ready;
initPredictions();
initQuestions();

const root = document.getElementById("sim-force");
whenVisible(root, () => mount(root));

const CHALLENGE_DISTANCE = 10; // m
const CHALLENGE_TIMES = [2, 2.5, 3, 4]; // s
const CHALLENGE_TOLERANCE = 0.1; // s
const near = (a, b) => Math.abs(a - b) < 1e-9;

function mount(root) {
  const model = createForceModel({ ...FORCE_DEFAULTS, finish: null });
  const canvas = root.querySelector("canvas");
  const live = createLiveText(root.querySelector('[data-role="live"]'));
  const guide = root.querySelector('[data-role="guide"]');
  const trialsBody = root.querySelector('[data-role="trials"]');
  const dataBody = root.querySelector('[data-role="table"]');
  const series = { a: new Series(), v: new Series() };
  const trials = []; // { n, f, m, a }
  const rows = [];
  let trialCount = 0;
  let mode = "free";
  let challengeT = 3;
  let colors = readColors();
  let layout = {};
  let sim = null;
  let lastSample = -1;
  let lastRow = -1;
  let guideState = { key: "", vars: {} };
  let arrowHit = null;

  const { ctx, size } = setupCanvas(canvas, (w) => (w < 560 ? 0.62 : 1.5), (w, h) => {
    const sceneH = Math.round(h * (w < 560 ? 0.42 : 0.5));
    layout = { margin: 48, sceneH, pxPerM: (w - 96) / model.params.trackLength, pxPerN: w / 150, pxPerA: w / 60, pxPerMs: w / 60 };
    updateScaleLegend();
    sim?.redraw();
  });

  function updateScaleLegend() {
    root.querySelector('[data-role="scale-f"]').textContent = t("common.sim.scale", { px: Math.round(10 * layout.pxPerN), value: 10, unit: "N" });
  }

  const cartX = (x) => layout.margin + x * layout.pxPerM;

  function render(state, params) {
    const w = size.width;
    const h = size.height;
    const { sceneH, margin, pxPerM } = layout;
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);
    const y = sceneH - 34;
    // pista con metri
    ctx.strokeStyle = colors.ground;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(w - margin, y);
    ctx.stroke();
    ctx.fillStyle = colors.inkSoft;
    ctx.font = `12px ${colors.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineWidth = 1.5;
    for (let m = 0; m <= params.trackLength; m++) {
      const x = margin + m * pxPerM;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + (m % 5 === 0 ? 10 : 5));
      ctx.stroke();
      if (m % 5 === 0) ctx.fillText(`${m} m`, x, y + 12);
    }
    // traguardo della sfida
    if (params.finish != null) {
      const fx = cartX(params.finish);
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(fx, y - 90);
      ctx.lineTo(fx, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colors.ink;
      ctx.font = `700 13px ${colors.font}`;
      ctx.fillText(t("law2.sim.finishLabel"), fx, y - 108);
    }
    // carrello: la scritta della massa cresce con m
    const cw = 44 + params.mass * 2.4;
    const ch = 28 + params.mass * 1.2;
    const cx = cartX(state.x);
    ctx.fillStyle = colors.surface;
    ctx.strokeStyle = colors.body;
    ctx.lineWidth = 3;
    ctx.beginPath();
    roundRectPath(ctx, cx - cw / 2, y - ch - 10, cw, ch, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.ink;
    for (const dx of [-cw / 3, cw / 3]) {
      ctx.beginPath();
      ctx.arc(cx + dx, y - 6, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = `700 13px ${colors.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${fmt(params.mass, 1)} kg`, cx, y - 10 - ch / 2);
    // vettori: F (tratteggiata) parte dal bordo del carrello nel verso della forza,
    // a (puntinata) e v (piena) sopra il carrello
    const applied = params.force * params.dir;
    const fy = y - 10 - ch / 2;
    const fx = cx + params.dir * (cw / 2 + 4);
    drawArrow(ctx, fx, fy, applied * layout.pxPerN, 0, { color: colors.vecF, label: "F", dash: [8, 5], font: colors.font, labelOffset: -14 });
    // zona trascinabile: la freccia della forza (più un margine attorno al carrello quando F = 0)
    arrowHit = { y: fy, x0: cx - cw / 2 - Math.max(40, params.force * layout.pxPerN + 24), x1: cx + cw / 2 + Math.max(40, params.force * layout.pxPerN + 24), half: cw / 2 + 4 };
    drawArrow(ctx, cx, y - ch - 26, state.a * layout.pxPerA, 0, { color: colors.vecA, label: "a", dash: [2, 5], font: colors.font });
    drawArrow(ctx, cx, y - ch - 56, state.v * layout.pxPerMs, 0, { color: colors.vecV, label: "v", font: colors.font });

    // grafici a–t e v–t: affiancati su schermi larghi, impilati su quelli stretti
    const gy = sceneH + 4;
    const gh = h - sceneH - 10;
    const opts = (title, yLabel, data, color, dash, yMax) => ({
      colors, title, xLabel: t("common.sim.time"), yLabel, yMin: Math.min(0, ...data.points.map((p) => p[1])), yMax, tWindow: 4, series: [{ data, color, dash }],
    });
    const aMax = Math.max(2, ...series.a.points.map((p) => p[1]));
    const vMax = Math.max(4, ...series.v.points.map((p) => p[1]));
    if (w < 560) {
      drawGraphAt(ctx, 6, gy, w - 12, gh / 2 - 4, opts(t("law2.sim.graphA"), t("law2.sim.graphAY"), series.a, colors.vecA, [2, 4], aMax * 1.15));
      drawGraphAt(ctx, 6, gy + gh / 2 + 4, w - 12, gh / 2 - 4, opts(t("law2.sim.graphV"), t("law2.sim.graphVY"), series.v, colors.vecV, [], vMax * 1.15));
    } else {
      drawGraphAt(ctx, 6, gy, w / 2 - 10, gh, opts(t("law2.sim.graphA"), t("law2.sim.graphAY"), series.a, colors.vecA, [2, 4], aMax * 1.15));
      drawGraphAt(ctx, w / 2 + 4, gy, w / 2 - 10, gh, opts(t("law2.sim.graphV"), t("law2.sim.graphVY"), series.v, colors.vecV, [], vMax * 1.15));
    }
  }

  sim = createSimulation({ model, render });

  // ---------- testi ----------
  const expectedA = () => (model.params.force * model.params.dir) / model.params.mass;

  function describe() {
    const s = model.state;
    const p = model.params;
    writeReadout(root, {
      f: unit(p.force * p.dir, 0, "N"),
      net: unit(s.net, 1, "N"),
      m: unit(p.mass, 1, "kg"),
      a: unit(s.a, 2, "m/s²"),
      v: unit(s.v, 2, "m/s"),
      x: unit(s.x, 2, "m"),
    });
    if (s.t === 0) return t("law2.sim.ready", { f: fmt(p.force * p.dir, 0), m: fmt(p.mass, 1) });
    if (s.v === 0 && s.net === 0 && p.force > 0 && !s.ended) return t("law2.sim.static", { f: fmt(p.force, 0) });
    return t("law2.sim.moving", { f: fmt(s.net, 1), m: fmt(p.mass, 1), a: fmt(s.a, 2), v: fmt(s.v, 2) });
  }

  function setGuide(key, vars = {}) {
    guideState = { key, vars };
    if (!key) guide.replaceChildren();
    else setRich(guide, t(key, vars));
  }

  const showTrials = () => fillTable(trialsBody, trials.map((r) => [String(r.n), fmt(r.f, 0), fmt(r.m, 1), fmt(r.a, 2)]), "law2.sim.noTrials", 4);
  const showData = () => fillTable(dataBody, rows.map((r) => [fmt(r[0], 2), fmt(r[1], 2), fmt(r[2], 2), fmt(r[3], 2)]), undefined, 4);

  /** Guida della modalità "Scopri la regola": confronta le ultime due prove. */
  function ruleGuide() {
    if (trials.length === 0) return setGuide("law2.sim.ruleStart");
    if (trials.length === 1) return setGuide("law2.sim.ruleNext");
    const [prev, last] = trials.slice(-2);
    const vars = { a1: fmt(prev.a, 2), a2: fmt(last.a, 2), f1: fmt(prev.f, 0), f2: fmt(last.f, 0), m1: fmt(prev.m, 1), m2: fmt(last.m, 1) };
    if (near(prev.m, last.m) && near(last.f, 2 * prev.f) && prev.f !== 0) return setGuide("law2.sim.ruleForceDouble", vars);
    if (near(prev.f, last.f) && near(last.m, 2 * prev.m)) return setGuide("law2.sim.ruleMassDouble", vars);
    return setGuide("law2.sim.ruleOther", vars);
  }

  function challengeGoal() {
    setGuide("law2.sim.challengeGoal", { d: fmt(CHALLENGE_DISTANCE, 0), T: fmt(challengeT, 1) });
  }

  // ---------- eventi della simulazione ----------
  sim.on("tick", (s) => {
    if (s.t - lastSample >= 1 / 30) {
      series.a.push(s.t, s.a);
      series.v.push(s.t, s.v);
      lastSample = s.t;
    }
    if (s.t > 0 && s.t - lastRow >= 0.25) {
      rows.push([s.t, s.a, s.v, s.x]);
      if (rows.length > 16) rows.shift();
      showData();
      lastRow = s.t;
    }
    live.soon(describe());
  });

  sim.on("end", () => {
    const p = model.params;
    const a = model.measuredAcceleration();
    trials.push({ n: ++trialCount, f: p.force * p.dir, m: p.mass, a });
    if (trials.length > 5) trials.shift();
    showTrials();
    sim.pause();
    live.now(t("law2.sim.end", { f: fmt(p.force * p.dir, 0), m: fmt(p.mass, 1), a: fmt(a, 2) }));
    if (mode === "rule") ruleGuide();
  });

  sim.on("finish", (ev) => {
    if (mode !== "challenge") return;
    const p = model.params;
    const vars = { t: fmt(ev.t, 2), f: fmt(p.force, 0), m: fmt(p.mass, 1), a: fmt(p.force / p.mass, 2) };
    const diff = ev.t - challengeT;
    if (Math.abs(diff) <= CHALLENGE_TOLERANCE) setGuide("law2.sim.challengeWin", vars);
    else {
      setGuide(diff < 0 ? "law2.sim.challengeEarly" : "law2.sim.challengeLate", vars);
      guide.append(" ", t("law2.sim.challengeHint"));
    }
  });

  function clearRun() {
    series.a.clear();
    series.v.clear();
    rows.length = 0;
    lastSample = -1;
    lastRow = -1;
    showData();
  }
  sim.on("reset", () => {
    clearRun();
    live.now(describe());
  });

  // ---------- controlli ----------
  const forceInput = root.querySelector("#l2-force");
  const massInput = root.querySelector("#l2-mass");
  const frictionInput = root.querySelector("#l2-friction");
  const dirInputs = [...root.querySelectorAll('input[name="l2-dir"]')];

  const force = bindRange(forceInput, {
    format: (v) => unit(v, 0, "N"),
    onInput: (v) => {
      sim.setParam("force", v);
      // .soon: al massimo un annuncio al secondo mentre si muove il cursore
      live.soon(t("law2.sim.forceChanged", { f: fmt(v * model.params.dir, 0), a: fmt(expectedA(), 2) }));
    },
  });
  addShiftStep(forceInput, 5);
  bindRange(massInput, {
    format: (v) => unit(v, 1, "kg"),
    onInput: (v) => {
      sim.setParam("mass", v);
      live.soon(t("law2.sim.massChanged", { m: fmt(v, 1), a: fmt(expectedA(), 2) }));
    },
  });
  addShiftStep(massInput, 2.5);
  frictionInput.addEventListener("change", () => sim.setParam("friction", frictionInput.checked));
  for (const input of dirInputs) {
    input.addEventListener("change", () => {
      sim.setParam("dir", Number(input.value));
      if (model.state.t === 0) sim.reset(); // il carrello parte dal lato opposto alla forza
    });
  }
  root.querySelector('[data-role="controls"]').addEventListener("submit", (e) => e.preventDefault());

  // trascinamento della punta della freccia della forza (alternativa da tastiera: il cursore)
  let dragging = false;
  const forceFromPointer = (e) => {
    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - rect.left - cartX(model.state.x);
    // la punta segue il puntatore: lato destro del carrello = forza verso destra
    const len = Math.max(0, Math.abs(dx) - (arrowHit?.half ?? 0));
    const f = Math.max(0, Math.min(50, Math.round(len / layout.pxPerN)));
    const dir = dx >= 0 ? 1 : -1;
    if (dir !== model.params.dir && !dirInputs[0].disabled) {
      dirInputs.find((i) => Number(i.value) === dir).checked = true;
      sim.setParam("dir", dir);
    }
    // in modalità Sfida il verso è bloccato: dal lato opposto la forza si azzera
    const value = dir === model.params.dir ? f : 0;
    force.set(value);
    sim.setParam("force", value);
  };
  canvas.addEventListener("pointerdown", (e) => {
    // si trascina solo partendo dalla freccia: un tocco altrove (es. per scorrere la pagina) non cambia la forza
    if (!overArrow(e)) return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    forceFromPointer(e);
  });
  const overArrow = (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return arrowHit && Math.abs(py - arrowHit.y) <= 22 && px >= arrowHit.x0 && px <= arrowHit.x1;
  };
  canvas.addEventListener("pointermove", (e) => {
    if (dragging) forceFromPointer(e);
    else canvas.style.cursor = overArrow(e) ? "ew-resize" : "";
  });
  canvas.addEventListener("pointercancel", () => (dragging = false));
  canvas.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    live.now(t("law2.sim.forceChanged", { f: fmt(model.params.force * model.params.dir, 0), a: fmt(expectedA(), 2) }));
  });

  // modalità
  const modeButtons = [...root.querySelectorAll("[data-mode]")];
  const challengeBtn = root.querySelector('[data-action="challenge"]');
  function setMode(next) {
    mode = next;
    modeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    challengeBtn.hidden = mode !== "challenge";
    const challenge = mode === "challenge";
    frictionInput.disabled = challenge;
    dirInputs.forEach((i) => (i.disabled = challenge));
    if (challenge) {
      frictionInput.checked = false;
      sim.setParam("friction", false);
      dirInputs[0].checked = true;
      sim.setParam("dir", 1);
      sim.setParam("finish", CHALLENGE_DISTANCE);
      challengeGoal();
    } else {
      sim.setParam("finish", null);
      if (mode === "rule") ruleGuide();
      else setGuide("");
    }
    sim.pause();
    sim.reset();
  }
  modeButtons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  challengeBtn.addEventListener("click", () => {
    const others = CHALLENGE_TIMES.filter((x) => x !== challengeT);
    challengeT = others[Math.floor(Math.random() * others.length)];
    sim.pause();
    sim.reset();
    challengeGoal();
  });

  document.addEventListener("themechange", () => {
    colors = readColors();
    sim.redraw();
  });
  document.addEventListener("langchange", () => {
    updateScaleLegend();
    showTrials();
    showData();
    if (guideState.key) setGuide(guideState.key, guideState.vars);
    live.now(describe());
    sim.redraw();
  });

  setupPlayback(root, sim, {
    autoStart: false, // la prova parte quando l'utente preme "Avvia"
    onBeforeStart: () => {
      if (model.state.ended) sim.reset();
      if (mode === "challenge" && model.state.t === 0) challengeGoal();
    },
  });
  showTrials();
  showData();
  live.now(describe());
  sim.redraw();
}
