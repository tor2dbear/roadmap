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
// A name that matches nothing used to run zero tests and exit 0 — a typo in a CI
// invocation would have read as a clean suite.
const unknown = only.filter((a) => !FILES.includes(a));
if (unknown.length) {
  console.error(`okänd testfil: ${unknown.join(", ")} — finns: ${FILES.join(", ")}`);
  process.exit(2);
}

await withBrowser(async (ctx) => {
  for (const name of names) {
    const mod = await import(`./${name}.test.mjs`);
    const before = failed();
    process.stdout.write(`${name} … `);
    const t0 = Date.now();
    try {
      await mod.run(ctx);
    } catch (err) {
      threw.push(name);
      console.log(`\n  ✗ ${name} kastade: ${err && err.stack ? err.stack : err}`);
    } finally {
      // Even after a throw: a leaked page keeps rendering into the next file's timings
      // and, on a slow machine, its results.
      await ctx.open.closeAll();
    }
    const ms = Date.now() - t0;
    const threwHere = threw[threw.length - 1] === name;
    console.log(failed() === before && !threwHere ? `ok (${ms} ms)` : `FEL (${ms} ms)`);
  }
});

const { checks, failures } = tally();
const bad = failures + threw.length;
console.log(`\n${checks} kontroller, ${failures} fel${threw.length ? `, ${threw.length} fil(er) kastade` : ""}`);
// `exitCode`, not `exit()`: exiting immediately after a write can drop it when stdout
// is a pipe, which in CI is exactly where the summary is read from.
process.exitCode = bad ? 1 : 0;
