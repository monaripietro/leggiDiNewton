// Audit di accessibilità automatico con axe-core (WCAG 2.2 A/AA) su tutte le pagine,
// in tema chiaro e scuro, a 1280px e 320px di larghezza.
// Uso: npm pack axe-core && tar xzf axe-core-*.tgz
//      python3 -m http.server 8123 & node tests/a11y.mjs http://localhost:8123/ package/axe.min.js
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:8123/";
const axeSource = readFileSync(process.argv[3] || "node_modules/axe-core/axe.min.js", "utf8");
const pages = ["index.html", "storia.html", "legge-1.html", "legge-2.html", "legge-3.html", "quiz.html", "fonti.html"];

const browser = await chromium.launch();
let serious = 0;
for (const scheme of ["light", "dark"]) {
  for (const width of [1280, 320]) {
    const context = await browser.newContext({ colorScheme: scheme, viewport: { width, height: 800 }, bypassCSP: true });
    for (const p of pages) {
      const page = await context.newPage();
      await page.goto(base + p, { waitUntil: "networkidle" });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
      // scroll orizzontale (layout a 320px senza perdita di contenuto)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await page.addScriptTag({ content: axeSource });
      const result = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
      });
      const bad = result.filter((v) => v.impact === "serious" || v.impact === "critical");
      serious += bad.length + (overflow > 0 ? 1 : 0);
      const label = `[${scheme} ${width}px] ${p}`;
      if (!result.length && overflow <= 0) console.log(`ok   ${label}`);
      else {
        console.log(`${bad.length || overflow > 0 ? "FAIL" : "warn"} ${label}${overflow > 0 ? ` (scroll orizzontale ${overflow}px)` : ""}`);
        for (const v of result) console.log(`  - ${v.impact}: ${v.id} — ${v.help} → ${v.nodes.join(" | ")}`);
      }
      await page.close();
    }
    await context.close();
  }
}
await browser.close();
process.exit(serious ? 1 : 0);
