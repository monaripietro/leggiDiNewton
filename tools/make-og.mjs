// Genera assets/img/og-image.png da og-image.svg (facoltativo, richiede Playwright).
// Uso: python3 -m http.server 8123 & node tools/make-og.mjs http://localhost:8123/
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:8123/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
// la pagina dei font serve a caricare i woff2 self-hosted prima della cattura
await page.goto(`${base}index.html`);
await page.evaluate(async (url) => {
  const svg = await (await fetch(url)).text();
  document.body.replaceChildren();
  document.body.style.margin = "0";
  const holder = document.createElement("div");
  holder.innerHTML = svg; // file locale del progetto, fidato
  document.body.append(holder);
  await document.fonts.ready;
}, `${base}assets/img/og-image.svg`);
await page.waitForTimeout(300);
await page.screenshot({ path: new URL("../assets/img/og-image.png", import.meta.url).pathname, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log("og-image.png generata");
