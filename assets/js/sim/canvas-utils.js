// Utilità di disegno su canvas: scaling per devicePixelRatio, colori dai token CSS, frecce, grafici.

/**
 * Prepara un canvas nitido sugli schermi ad alta densità e lo ridimensiona con il contenitore.
 * `onResize(width, height)` riceve le dimensioni in pixel CSS.
 */
export function setupCanvas(canvas, aspect, onResize) {
  const ctx = canvas.getContext("2d");
  const size = { width: 0, height: 0 };
  function resize() {
    const width = canvas.parentElement.clientWidth || 600;
    const ratio = typeof aspect === "function" ? aspect(width) : aspect;
    const height = Math.round(width / ratio);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size.width = width;
    size.height = height;
    onResize?.(width, height);
  }
  resize();
  if ("ResizeObserver" in window) {
    let last = canvas.parentElement.clientWidth;
    new ResizeObserver(() => {
      const w = canvas.parentElement.clientWidth;
      if (w !== last) {
        last = w;
        resize();
      }
    }).observe(canvas.parentElement);
  } else {
    window.addEventListener("resize", resize);
  }
  return { ctx, size };
}

/** Legge i colori correnti dai token CSS (cambiano con il tema). */
export function readColors() {
  const s = getComputedStyle(document.documentElement);
  const v = (name) => s.getPropertyValue(name).trim();
  return {
    bg: v("--bg"),
    surface: v("--surface"),
    ink: v("--ink"),
    inkSoft: v("--ink-soft"),
    line: v("--line"),
    accent: v("--accent"),
    vecV: v("--vec-v"),
    vecF: v("--vec-f"),
    vecA: v("--vec-a"),
    ground: v("--sim-ground"),
    body: v("--sim-body"),
    mint: v("--mint"),
    peach: v("--peach"),
    lavender: v("--lavender"),
    sky: v("--sky"),
    lemon: v("--lemon"),
    font: getComputedStyle(document.body).fontFamily,
  };
}

/**
 * Freccia da (x, y) di lunghezza (dx, dy) in pixel, con etichetta testuale.
 * `dash` distingue i vettori anche senza colore (velocità: piena, forza: tratteggiata, accelerazione: puntinata).
 */
export function drawArrow(ctx, x, y, dx, dy, { color, label, dash = [], width = 4, font = "sans-serif", labelOffset = -14 } = {}) {
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(14, len * 0.6);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx - ux * head * 0.8, y + dy - uy * head * 0.8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * head - uy * head * 0.55, y + dy - uy * head + ux * head * 0.55);
  ctx.lineTo(x + dx - ux * head + uy * head * 0.55, y + dy - uy * head - ux * head * 0.55);
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.font = `700 15px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + dx / 2, y + dy / 2 + labelOffset);
  }
  ctx.restore();
}

/** Buffer circolare di campioni (t, valore) per i grafici in tempo reale. */
export class Series {
  constructor(maxPoints = 600) {
    this.maxPoints = maxPoints;
    this.points = [];
  }
  push(t, v) {
    this.points.push([t, v]);
    if (this.points.length > this.maxPoints) this.points.shift();
  }
  clear() {
    this.points.length = 0;
  }
}

/** Disegna un grafico nel rettangolo (x, y, w, h) del canvas. */
export function drawGraphAt(ctx, x, y, w, h, o) {
  ctx.save();
  ctx.translate(x, y);
  drawGraph(ctx, w, h, o);
  ctx.restore();
}

/**
 * Grafico semplice valore–tempo con assi etichettati.
 * @param {object} o { series: [{data: Series, color, dash}], xLabel, yLabel, yMin, yMax, tWindow, colors, title }
 */
export function drawGraph(ctx, w, h, o) {
  const { colors } = o;
  const pad = { l: 46, r: 10, t: o.title ? 30 : 12, b: 30 };
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;
  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, w, h);
  if (o.title) {
    ctx.font = `700 14px ${colors.font}`;
    ctx.fillStyle = colors.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(o.title, 8, 8);
  }

  let tMax = o.tWindow;
  for (const s of o.series) {
    const last = s.data.points.at(-1);
    if (last && last[0] > tMax) tMax = last[0];
  }
  const tMin = Math.max(0, tMax - o.tWindow);
  let { yMin, yMax } = o;
  // Estende la scala se i dati escono dai limiti previsti.
  for (const s of o.series) {
    for (const [, v] of s.data.points) {
      if (v > yMax) yMax = v * 1.1;
      if (v < yMin) yMin = v * 1.1;
    }
  }
  const X = (t) => pad.l + ((t - tMin) / (tMax - tMin)) * pw;
  const Y = (v) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * ph;

  ctx.font = `13px ${colors.font}`;
  ctx.fillStyle = colors.inkSoft;
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  // griglia e tacche
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const v of niceTicks(yMin, yMax, 4)) {
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(v));
    ctx.lineTo(pad.l + pw, Y(v));
    ctx.stroke();
    ctx.fillText(formatTick(v), pad.l - 6, Y(v));
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const t of niceTicks(tMin, tMax, 5)) {
    ctx.fillText(formatTick(t), X(t), pad.t + ph + 4);
  }
  // assi
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + ph);
  ctx.lineTo(pad.l + pw, pad.t + ph);
  ctx.stroke();
  if (yMin < 0 && yMax > 0) {
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(0));
    ctx.lineTo(pad.l + pw, Y(0));
    ctx.stroke();
  }
  // etichette assi
  ctx.fillStyle = colors.ink;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(o.xLabel, pad.l + pw, h - 1);
  ctx.save();
  ctx.translate(12, pad.t + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(o.yLabel, 0, 0);
  ctx.restore();
  // curve
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.l, pad.t, pw, ph);
  ctx.clip();
  for (const s of o.series) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(s.dash || []);
    ctx.beginPath();
    let started = false;
    for (const [t, v] of s.data.points) {
      if (t < tMin) continue;
      if (!started) {
        ctx.moveTo(X(t), Y(v));
        started = true;
      } else ctx.lineTo(X(t), Y(v));
    }
    ctx.stroke();
  }
  ctx.restore();
}

function niceTicks(min, max, count) {
  const span = max - min;
  if (span <= 0) return [min];
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v / step) * step);
  return ticks;
}

function formatTick(v) {
  const r = Math.round(v * 100) / 100;
  return String(r).replace(".", document.documentElement.lang === "it" ? "," : ".");
}

/** Sceglie un passo "tondo" per la scala delle frecce, es. 1 freccia di 40 px = 10 N. */
export function roundScale(value) {
  const mag = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= value);
}

/** Rettangolo arrotondato; usa arcTo dove ctx.roundRect non esiste (Firefox < 112, Safari < 16). */
export function roundRectPath(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
