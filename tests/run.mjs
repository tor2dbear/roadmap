// One runner, no framework. The suite is five files of assertions against a real
// browser; a test framework would add a dependency, a config and a vocabulary to
// learn, and buy nothing this file does not already do in forty lines.
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { withBrowser } from "./fixture.mjs";
import { tally, failed } from "./assert.mjs";

// Discovered, not listed. A hand-kept list is a second place to remember, and the one
// that gets forgotten — a test file that exists but is not enrolled reads as passing.
const HERE = fileURLToPath(new URL(".", import.meta.url));
const FILES = (await readdir(HERE))
  .filter((f) => f.endsWith(".test.mjs"))
  .map((f) => f.replace(/\.test\.mjs$/, ""))
  .sort();

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const threw = [];
const names = only.length ? FILES.filter((f) => only.includes(f)) : FILES;

await withBrowser(async (ctx) => {
  for (const name of names) {
    const mod = await import(`./${name}.test.mjs`);
    const before = failed();
    process.stdout.write(`${name} … `);
    const t0 = Date.now();
    try {
      await mod.run(ctx);
      await ctx.open.closeAll();
    } catch (err) {
      threw.push(name);
      console.log(`\n  ✗ ${name} kastade: ${err && err.stack ? err.stack : err}`);
    }
    const ms = Date.now() - t0;
    console.log(failed() === before ? `ok (${ms} ms)` : `FEL (${ms} ms)`);
  }
});

const { checks, failures } = tally();
const bad = failures + threw.length;
console.log(`\n${checks} kontroller, ${failures} fel${threw.length ? `, ${threw.length} fil(er) kastade` : ""}`);
process.exit(bad ? 1 : 0);
