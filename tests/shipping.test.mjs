// What ends up on roadmap.tor2dbear.com, asserted rather than remembered.
//
// The rule itself lives in `scripts/check-bundle.mjs`, not here, and that is the
// point: it runs from `predeploy` and from CI, where a test runner and a browser are
// not installed. This file asserts the rule holds for *this* repo, and — the half
// that was missing twice over — that the guard is actually wired into every path
// that uploads a bundle, including the exported product.
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { auditBundle, served } from "../scripts/check-bundle.mjs";
import { group, eq, ok } from "./assert.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

export async function run() {
  group("ingenting oavsiktligt skeppas");
  {
    // Three readings, because the git index and the directory wrangler uploads are
    // not the same set of files. Each has caught something the others could not:
    // `tests/` (#23) and a scratch probe (#29) were tracked; `*.tmp.*` was gitignored
    // and invisible to the index; `fonts/LICENSE.md` was inside a directory the
    // earlier name-only check never looked into.
    const a = await auditBundle(ROOT);
    ok(!a.fatal, `.assetsignore finns och gick att läsa (${a.fatal || "ok"})`);
    ok(a.tracked.length > 20, `git svarade med något (${a.tracked.length} filer)`);
    eq(a.looseTracked, [], `varje spårad fil är serverad eller utesluten — dessa är ingetdera: ${JSON.stringify(a.looseTracked)}`);
    eq(a.looseOnDisk, [], `inget i arbetskatalogen skulle följa med oavsiktligt — dessa skulle: ${JSON.stringify(a.looseOnDisk)}`);
    eq(a.listGap, [], `allt git ignorerar utesluts också ur bundlen — dessa saknas i .assetsignore: ${JSON.stringify(a.listGap)}`);

    // `SERVED` says what *may* ship, not what must — an instance without `_headers`
    // is not broken, and the product has none. But the board itself has to be there,
    // or the patterns have rotted into names that match nothing.
    const core = ["index.html", "app.js", "styles.css"];
    eq(core.filter((f) => !a.tracked.includes(f) || !served(f)), [],
      "brädans egna filer finns och räknas som serverade");
  }

  group("vakten körs innan något laddas upp");
  {
    // The guard existed and did not guard: `npm run deploy` calls wrangler directly,
    // and sync.yml — which deploys hourly on a schedule, with no PR gate in front of
    // it — went Harvest → `npx wrangler deploy`. Asked of the scripts rather than of
    // one name, so a new upload path is held to the same rule instead of skipping it.
    const pkg = JSON.parse(await readFile(ROOT + "package.json", "utf8"));
    const uploads = Object.keys(pkg.scripts).filter((k) =>
      /wrangler\s+(deploy|versions\s+upload)/.test(pkg.scripts[k]));
    ok(uploads.length > 0, `det finns skript som laddar upp bundlen (${JSON.stringify(uploads)})`);
    const unguarded = uploads.filter((k) => !/check-bundle\.mjs/.test(pkg.scripts["pre" + k] || ""));
    eq(unguarded, [], `vart och ett har en pre-hook som kör vakten — dessa saknar: ${JSON.stringify(unguarded)}`);

    // And the scheduled deploy, which npm's pre-hooks never see: it runs wrangler
    // through npx. Order matters, so this asserts position, not presence.
    const sync = await readFile(ROOT + ".github/workflows/sync.yml", "utf8");
    const guardAt = sync.indexOf("node scripts/check-bundle.mjs");
    const deployAt = sync.indexOf("npx wrangler deploy");
    ok(guardAt !== -1, "sync.yml kör vakten");
    ok(deployAt !== -1, "och deployar med wrangler");
    ok(guardAt !== -1 && deployAt !== -1 && guardAt < deployAt,
      `och vakten står före deployen (${guardAt} < ${deployAt})`);
  }

  group("varje wrangler-uppladdning går genom vakten");
  {
    // The fifth finding on this guard, and the one that should end the series: npm's
    // pre-hooks only fire when the script is invoked *through npm*. Every documented
    // path went around them — the README told adopters to set Cloudflare's deploy
    // command to `npx wrangler deploy`, the generated product README said the same,
    // and pr-preview.yml ran `npx wrangler versions upload` directly *after* the
    // harvest, so even the `npm test` earlier in that job had checked a different tree.
    //
    // So this stops naming files and asks the repo instead: find every invocation,
    // then prove each one is guarded. A sixth bypass cannot be added quietly.
    const files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
      .split("\n").filter(Boolean).filter((f) => !/\.(woff2|png|ico)$/.test(f));
    const INVOKE = /(npx wrangler|"wrangler) +(deploy|versions upload)/;

    const hits = [];
    for (const f of files) {
      // `roadmap/` is history — a landed puck describing what the deploy used to be —
      // and this file quotes the command in its own comments and assertions. Neither
      // runs anything. Every other file is fair game.
      if (f.startsWith("roadmap/") || f === "tests/shipping.test.mjs") continue;
      const text = await readFile(ROOT + f, "utf8");
      text.split("\n").forEach((line, i) => { if (INVOKE.test(line)) hits.push({ f, n: i + 1, line: line.trim() }); });
    }
    ok(hits.length >= 3, `det finns uppladdningar att granska (${hits.length})`);

    const pkg = JSON.parse(await readFile(ROOT + "package.json", "utf8"));
    const guardedScript = (line) => Object.keys(pkg.scripts).some((k) =>
      line.includes(`"${k}"`) && /check-bundle\.mjs/.test(pkg.scripts["pre" + k] || ""));
    const workflowGuarded = async (f, n) => {
      const text = await readFile(ROOT + f, "utf8");
      const guard = text.split("\n").findIndex((l) => /check-bundle\.mjs/.test(l));
      return guard !== -1 && guard + 1 < n; // and it has to come first
    };

    const unguarded = [];
    for (const h of hits) {
      if (h.f === "package.json" && guardedScript(h.line)) continue;
      if (h.f.startsWith(".github/workflows/") && await workflowGuarded(h.f, h.n)) continue;
      // The exporter writes the product's package.json; that one line is guarded by the
      // `predeploy` beside it. Scoped to the line, not the file — excluding the whole
      // file let the *prose* in the generated README point at bare `wrangler deploy`
      // and pass, which is the bypass this group exists to catch. Found by sabotage.
      if (h.f === "scripts/export-product.mjs" && /^deploy:\s*"wrangler deploy",?$/.test(h.line)
          && /predeploy:\s*"node scripts\/check-bundle\.mjs"/.test(await readFile(ROOT + h.f, "utf8"))) continue;
      unguarded.push(`${h.f}:${h.n}`);
    }
    eq(unguarded, [], `varje wrangler-anrop är grindat — dessa är inte: ${JSON.stringify(unguarded)}`);
  }

  group("produkten får vakten också");
  {
    // The finding that made the guard a script instead of a test. `export-product.mjs`
    // generates tor2dbear/etapp, whose README sends users straight to `wrangler
    // deploy` — so without this they can publish a stray root file exactly as this
    // repo twice did, and they are the people who did not write any of this.
    //
    // Read as source rather than imported: the exporter writes files when it runs.
    const src = await readFile(ROOT + "scripts/export-product.mjs", "utf8");
    ok(/"scripts\/check-bundle\.mjs"/.test(src), "COPY tar med vakten till produkten");
    ok(/predeploy:\s*"node scripts\/check-bundle\.mjs"/.test(src),
      "och den genererade package.json kopplar in den före deploy");
    // The product ships no test runner and no browser, which is *why* the guard is a
    // dependency-free script. If it ever grows an import beyond node builtins, it
    // stops working there — silently, since the export would still copy the file.
    const guard = await readFile(ROOT + "scripts/check-bundle.mjs", "utf8");
    const imports = [...guard.matchAll(/^import .*? from "([^"]+)"/gm)].map((m) => m[1]);
    eq(imports.filter((i) => !i.startsWith("node:")), [],
      `vakten importerar bara node-builtins: ${JSON.stringify(imports)}`);
  }
}
