// What ends up on roadmap.tor2dbear.com, asserted rather than remembered.
//
// The served bundle *is* the repo root — wrangler uploads the directory and
// `.assetsignore` names what to leave out. That makes it an exclusion list, which fails
// in the one direction nobody notices: a file nobody thought about is not left out, it
// is published. Twice in one session a file went out that way — the test suite itself
// (#23, caught in review) and a scratch probe (#29, caught by review again).
//
// So the rule is turned around here: every top-level entry has to be *either* something
// the board serves on purpose, or excluded. Anything else fails, and the author says
// which it is. "Every top-level entry" is asked three ways, because the git index and
// the directory wrangler uploads are not the same set of files.
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { group, eq, ok } from "./assert.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// The board and what it loads. Everything else is machinery, docs, or source data.
const SERVED = new Set(["index.html", "app.js", "styles.css", "data", "fonts", "_headers", "ROADMAP.md"]);

const lines = (text) => text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

// `.assetsignore` takes .gitignore-style patterns (Cloudflare's own migration guide
// writes `**/node_modules`), so a plain Set lookup answers only for the literal names.
// Top-level entries are all this file asks about, which keeps the matcher to the two
// forms in use: a name, and a `*` glob. A trailing slash and a leading `**/` are
// stripped rather than modelled — at the root they say nothing extra.
function matcher(pattern) {
  const p = pattern.replace(/^\*\*\//, "").replace(/\/$/, "");
  if (!p.includes("*")) return (name) => name === p;
  const rx = new RegExp("^" + p.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*") + "$");
  return (name) => rx.test(name);
}

export async function run() {
  const ignoreLines = lines(await readFile(ROOT + ".assetsignore", "utf8"));
  const ignoreMatch = ignoreLines.map(matcher);
  const excluded = (name) => ignoreMatch.some((m) => m(name));

  group("ingenting oavsiktligt skeppas");
  {
    const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
      .split("\n").filter(Boolean).map((p) => p.split("/")[0]);
    const top = [...new Set(tracked)].sort();
    ok(top.length > 5, `git svarade med något (${top.length} poster)`);

    const loose = top.filter((e) => !SERVED.has(e) && !excluded(e));
    eq(loose, [], `varje spårad toppnivåpost är antingen serverad eller utesluten — dessa är ingetdera: ${JSON.stringify(loose)}`);

    // And the other direction, so the served set cannot rot into a list of names that
    // no longer exist: everything we claim to serve has to be there.
    const missing = [...SERVED].filter((e) => !top.includes(e));
    eq(missing, [], `allt som påstås serveras finns också: ${JSON.stringify(missing)}`);
  }

  group("de två uteslutningslistorna får inte säga olika");
  {
    // Found in review: the check above reads the *git index*, and wrangler uploads the
    // *directory*. A gitignored file is invisible to `git ls-files` and still sits in
    // the working tree, so `npm run deploy` from a developer checkout publishes it.
    //
    // The two lists answer different questions — "is this part of the project" and "is
    // this part of the site" — but the first answer implies the second: a file git does
    // not track is never something to publish. So every .gitignore pattern has to be
    // excluded from the bundle too.
    //
    // They had already drifted, and this PR widened the gap: `*.tmp.*` was gitignored
    // in the very commit that deleted probe.tmp.mjs, which left the next probe free to
    // be uploaded locally while this file, reading the index, saw nothing. `.sources/`
    // was the worse one — the harvester clones the source repos into it.
    const gitignore = lines(await readFile(ROOT + ".gitignore", "utf8"));
    ok(gitignore.length > 3, `.gitignore har mönster att jämföra (${gitignore.length})`);

    const norm = (p) => p.replace(/^\*\*\//, "").replace(/\/$/, "");
    const ignoredNames = new Set(ignoreLines.map(norm));
    const gap = gitignore.map(norm).filter((p) => !ignoredNames.has(p));
    eq(gap, [], `allt git ignorerar utesluts också ur bundlen — dessa saknas i .assetsignore: ${JSON.stringify(gap)}`);
  }

  group("det som faktiskt ligger i roten");
  {
    // The third reading, and the only one that sees a file which is neither tracked nor
    // gitignored — the state a half-finished scratch file is in, and the one both
    // checks above are blind to. It can only speak for the checkout it runs in, so in
    // CI (a fresh clone) it repeats the first group. That is the point: the value is
    // local, on the machine where `npm run deploy` would be typed.
    const onDisk = (await readdir(ROOT, { withFileTypes: true }))
      .map((e) => e.name).filter((n) => n !== ".git").sort();
    ok(onDisk.length > 5, `roten har innehåll att läsa (${onDisk.length} poster)`);

    const loose = onDisk.filter((e) => !SERVED.has(e) && !excluded(e));
    eq(loose, [], `inget i arbetskatalogen skulle följa med oavsiktligt — dessa skulle: ${JSON.stringify(loose)}`);
  }

  group("vakten körs innan något laddas upp");
  {
    // Found in review, and it was the sharpest of the three: the guard above existed
    // and did not guard. `npm run deploy` calls wrangler directly, and sync.yml — which
    // deploys hourly on a schedule, with no PR gate in front of it — went Harvest →
    // `npx wrangler deploy`. So the on-disk reading, written for exactly the local
    // deploy case, only ran if someone happened to type `npm test` first.
    //
    // Asked of the scripts rather than of one name, so a new upload path (a second
    // preview command, say) is held to the same rule instead of quietly skipping it.
    const pkg = JSON.parse(await readFile(ROOT + "package.json", "utf8"));
    const uploads = Object.keys(pkg.scripts).filter((k) =>
      /wrangler\s+(deploy|versions\s+upload)/.test(pkg.scripts[k]));
    ok(uploads.length > 0, `det finns skript som laddar upp bundlen (${JSON.stringify(uploads)})`);
    const unguarded = uploads.filter((k) => !/tests\/run\.mjs shipping/.test(pkg.scripts["pre" + k] || ""));
    eq(unguarded, [], `vart och ett har en pre-hook som kör vakten — dessa saknar: ${JSON.stringify(unguarded)}`);

    // And the scheduled deploy, which npm's pre-hooks never see: it runs wrangler
    // through npx. Order matters, so this asserts position, not presence.
    const sync = await readFile(ROOT + ".github/workflows/sync.yml", "utf8");
    const guardAt = sync.indexOf("node tests/run.mjs shipping");
    const deployAt = sync.indexOf("npx wrangler deploy");
    ok(guardAt !== -1, "sync.yml kör vakten");
    ok(deployAt !== -1, "och deployar med wrangler");
    ok(guardAt !== -1 && deployAt !== -1 && guardAt < deployAt,
      `och vakten står före deployen (${guardAt} < ${deployAt})`);
  }
}
