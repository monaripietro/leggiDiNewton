// Smoke test facoltativo con Playwright: apre ogni pagina, raccoglie errori console e salva screenshot.
// Uso: python3 -m http.server 8123 & node tests/smoke.mjs [http://localhost:8123/] [cartella-screenshot]
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:8123/";
const outDir = process.argv[3] || null;
const pages = ["index.html", "storia.html", "legge-1.html", "legge-2.html", "legge-3.html", "quiz.html", "fonti.html"];

const browser = await chromium.launch();
let failures = 0;
for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
  for (const p of pages) {
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()}`));
    page.on("request", (r) => !r.url().startsWith(base) && errors.push(`richiesta esterna: ${r.url()}`));
    const res = await page.goto(base + p, { waitUntil: "networkidle" });
    if (!res || !res.ok()) errors.push(`HTTP ${res?.status()}`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (outDir) await page.screenshot({ path: `${outDir}/${scheme}-${p.replace(".html", "")}.png`, fullPage: true });
    console.log(`${errors.length ? "FAIL" : "ok  "} [${scheme}] ${p}${errors.length ? "\n  " + errors.join("\n  ") : ""}`);
    failures += errors.length;
    await page.close();
  }
  await context.close();
}
await browser.close();
process.exit(failures ? 1 : 0);
