// What ends up on roadmap.tor2dbear.com, asserted rather than remembered.
//
// The served bundle *is* the repo root — wrangler uploads the directory and
// `.assetsignore` names what to leave out. That makes it an exclusion list, which fails
// in the one direction nobody notices: a file nobody thought about is not left out, it
// is published. Twice in one session a file went out that way — the test suite itself
// (#23, caught in review) and a scratch probe (#29, caught by review again).
//
// So the rule is turned around here: every tracked top-level entry has to be *either*
// something the board serves on purpose, or listed in `.assetsignore`. Anything else
// fails, and the author says which it is.
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { group, eq, ok } from "./assert.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// The board and what it loads. Everything else is machinery, docs, or source data.
const SERVED = new Set(["index.html", "app.js", "styles.css", "data", "fonts", "_headers", "ROADMAP.md"]);

export async function run() {
  group("ingenting oavsiktligt skeppas");
  {
    const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
      .split("\n").filter(Boolean).map((p) => p.split("/")[0]);
    const top = [...new Set(tracked)].sort();
    ok(top.length > 5, `git svarade med något (${top.length} poster)`);

    const ignored = new Set((await readFile(ROOT + ".assetsignore", "utf8"))
      .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));

    const loose = top.filter((e) => !SERVED.has(e) && !ignored.has(e));
    eq(loose, [], `varje toppnivåpost är antingen serverad eller utesluten — dessa är ingetdera: ${JSON.stringify(loose)}`);

    // And the other direction, so the served set cannot rot into a list of names that
    // no longer exist: everything we claim to serve has to be there.
    const missing = [...SERVED].filter((e) => !top.includes(e));
    eq(missing, [], `allt som påstås serveras finns också: ${JSON.stringify(missing)}`);
  }
}
