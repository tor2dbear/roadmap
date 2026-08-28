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

// What the board serves, and what may live inside each of it. Stated as patterns over
// *paths*, not as a set of top-level names: `data` and `fonts` are directories, and a
// name-only rule passes anything dropped inside them — `data/notes.txt` publishes just
// as readily as a file in the root does. Naming the contents is also the only way the
// list says what it means: `data/` holds the two harvested payloads and nothing else.
const SERVED = {
  "index.html": /^index\.html$/,
  "app.js": /^app\.js$/,
  "styles.css": /^styles\.css$/,
  "_headers": /^_headers$/,
  "ROADMAP.md": /^ROADMAP\.md$/,
  data: /^data\/roadmap\.(json|js)$/,
  // LICENSE.md belongs in the bundle and is not an oversight: Geist is OFL-1.1, which
  // requires the licence to travel with the font files. The recursive check found it
  // immediately — the old name-only rule could not see inside `fonts` at all.
  fonts: /^fonts\/([\w.-]+\.woff2|LICENSE\.md)$/,
};
const servedPath = (rel) => Object.keys(SERVED).some((k) => SERVED[k].test(rel));

const lines = (text) => text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

// `.assetsignore` takes .gitignore-style patterns (Cloudflare's own migration guide
// writes `**/node_modules`), so a plain Set lookup answers only for literal names. Two
// forms are in use — a name and a `*` glob — and gitignore's rule that a slash-free
// pattern matches at any depth is what makes `roadmap` exclude `roadmap/x.md`.
function matcher(pattern) {
  const p = pattern.replace(/^\*\*\//, "").replace(/\/$/, "");
  const rx = p.includes("*")
    ? new RegExp("^" + p.split("*").map((x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*") + "$")
    : null;
  const hit = (seg) => (rx ? rx.test(seg) : seg === p);
  return (rel) => rel.split("/").some(hit);
}

// Walks what wrangler would upload: everything under the root that is not excluded.
// Excluded directories are not descended into — `node_modules` is the reason, and it is
// also the honest model, since wrangler does not look inside them either.
async function walk(dir, excluded, prefix = "") {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix + e.name;
    if (rel === ".git" || excluded(rel)) continue;
    if (e.isDirectory()) out.push(...await walk(dir + e.name + "/", excluded, rel + "/"));
    else out.push(rel);
  }
  return out;
}

export async function run() {
  const ignoreLines = lines(await readFile(ROOT + ".assetsignore", "utf8"));
  const ignoreMatch = ignoreLines.map(matcher);
  const excluded = (rel) => ignoreMatch.some((m) => m(rel));

  group("ingenting oavsiktligt skeppas");
  {
    // Full paths, not first components. Truncating at the first slash was the earlier
    // shape and it answered "is `data` allowed" for every file inside `data/`.
    const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
      .split("\n").filter(Boolean);
    ok(tracked.length > 20, `git svarade med något (${tracked.length} filer)`);

    const loose = tracked.filter((f) => !servedPath(f) && !excluded(f));
    eq(loose, [], `varje spårad fil är antingen serverad eller utesluten — dessa är ingetdera: ${JSON.stringify(loose)}`);

    // And the other direction, so the served list cannot rot into patterns that match
    // nothing: everything we claim to serve has to be there.
    const empty = Object.keys(SERVED).filter((k) => !tracked.some((f) => SERVED[k].test(f)));
    eq(empty, [], `allt som påstås serveras finns också: ${JSON.stringify(empty)}`);
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
    const onDisk = (await walk(ROOT, excluded)).sort();
    // The bundle is small on purpose — a board, its data, its fonts. Eleven files as
    // this is written, so the floor says "something was walked", not "a lot was".
    ok(onDisk.length > 5, `arbetskatalogen har innehåll att läsa (${onDisk.length} filer)`);

    const loose = onDisk.filter((f) => !servedPath(f));
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
