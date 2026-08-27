// The harness the board tests share: a static server, a browser, and one way to put
// known data in front of the page.
//
// Data goes in at the *network* layer — `page.route` answers the request for
// `data/roadmap.js` with our own payload — and never by poking `window.__ROADMAP__`
// after load. Poking races the boot: the board reads the global once, on load, so a
// test that sets it afterwards is measuring whichever of the two happened to win.
// That produced two false passes before this was written down.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PAYLOAD } from "./data.mjs";

const ROOT = normalize(join(fileURLToPath(new URL(".", import.meta.url)), ".."));
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

export async function serve() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(req.url.split("?")[0]);
    // Contain the read inside the repo: a served path is data, and `..` in it is a
    // request to read something the board never ships.
    const file = normalize(join(ROOT, path === "/" ? "/index.html" : path));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const port = server.address().port;
  return { origin: `http://127.0.0.1:${port}`, close: () => new Promise((ok) => server.close(ok)) };
}

// `open("?group=repo", { data: p => …, colorScheme, viewport })`
export async function makeOpener(browser, origin) {
  const pages = [];
  async function open(query = "", opts = {}) {
    const page = await browser.newPage({
      viewport: opts.viewport || { width: 1400, height: 900 },
      colorScheme: opts.colorScheme || "light",
      deviceScaleFactor: opts.deviceScaleFactor || 1,
    });
    pages.push(page);
    const payload = opts.data ? opts.data(structuredClone(PAYLOAD)) : PAYLOAD;
    await page.route("**/data/roadmap.js", (route) =>
      route.fulfill({
        contentType: "text/javascript; charset=utf-8",
        body: "window.__ROADMAP__ = " + JSON.stringify(payload) + ";",
      }));
    await page.goto(origin + "/index.html" + query);
    // The board renders from the payload synchronously on load; this waits for the
    // first paint of a column rather than for a fixed delay, so a slow machine does
    // not turn into a flake.
    await page.waitForSelector(".board", { state: "attached" });
    await page.waitForFunction(() => document.querySelectorAll(".column, .list-group").length > 0
      || !!document.querySelector(".board")?.textContent.trim(), null, { timeout: 10000 });
    return page;
  }
  open.closeAll = async () => { await Promise.all(pages.splice(0).map((p) => p.close())); };
  return open;
}

export async function withBrowser(fn) {
  const site = await serve();
  const browser = await chromium.launch();
  try {
    const open = await makeOpener(browser, site.origin);
    return await fn({ open, origin: site.origin, browser });
  } finally {
    await browser.close();
    await site.close();
  }
}

// The board's own reading of itself, as the tests want to talk about it.
export const READ = {
  columns: () => [...document.querySelectorAll(".board > .column:not(.hidden-cols) .col-head h2")]
    .map((h) => h.textContent.trim()),
  tray: () => [...document.querySelectorAll(".hidden-col")]
    .map((r) => r.textContent.replace(/\s+/g, " ").trim()),
  chips: () => [...document.querySelectorAll(".fchip-label")].map((c) => c.textContent.trim()),
  groups: () => [...document.querySelectorAll(".list-group .lh-label")].map((e) => e.textContent.trim()),
};

export function snapshot(page) {
  return page.evaluate(() => ({
    columns: [...document.querySelectorAll(".board > .column:not(.hidden-cols) .col-head h2")]
      .map((h) => h.textContent.trim()),
    tray: [...document.querySelectorAll(".hidden-col")]
      .map((r) => r.textContent.replace(/\s+/g, " ").trim()),
    chips: [...document.querySelectorAll(".fchip-label")].map((c) => c.textContent.trim()),
    groups: [...document.querySelectorAll(".list-group .lh-label")].map((e) => e.textContent.trim()),
    query: new URLSearchParams(location.search).get("q"),
  }));
}
