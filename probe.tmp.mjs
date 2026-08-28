import { readFile } from "node:fs/promises";
import { serve } from "./tests/fixture.mjs";
import { chromium } from "playwright";
const live = await readFile("/tmp/live.js", "utf8");
const { origin, close } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route("**/data/roadmap.js", (r) => r.fulfill({ contentType: "text/javascript; charset=utf-8", body: live }));
await page.goto(origin + "/index.html");
await page.waitForTimeout(1200);
console.log(await page.evaluate(() => {
  const cols = [...document.querySelectorAll(".board > .column")].slice(0, 3);
  return {
    sida: { scrollW: document.documentElement.scrollWidth, view: window.innerWidth },
    kolumner: cols.map((c) => {
      const h = c.querySelector(".card h3");
      const m = c.querySelector(".card-meta");
      const t = c.querySelector(".tagpill");
      return {
        namn: c.querySelector(".col-head h2")?.textContent.trim(),
        bredd: Math.round(c.getBoundingClientRect().width),
        titel: h && getComputedStyle(h).fontSize,
        meta: m && getComputedStyle(m).fontSize,
        tagg: t && getComputedStyle(t).fontSize,
      };
    }),
  };
}));
await browser.close(); await close();
