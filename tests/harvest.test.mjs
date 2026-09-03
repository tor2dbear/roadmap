// The harvester, which had no test at all until the rollup learned to count a tree.
//
// That gap is worth naming: `resolveHierarchy` decides `parentRef`, `children`,
// `progress` and half the signals, and every board test reads a *fixture* payload —
// so the code that produces the real one was measured only by looking at the board
// afterwards. This file runs the actual script over a small repo of real markdown and
// reads what it wrote. No browser; it ignores the context the runner hands it.
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { group, eq, ok } from "./assert.mjs";

const exec = promisify(execFile);
const ROOT = fileURLToPath(new URL("..", import.meta.url));

// One puck, as a file. Written rather than templated into a payload, because the point
// of this file is that the frontmatter reader, the adapter and the hierarchy resolver
// all run for real.
const puck = (o) => {
  const fm = ["---", `title: ${o.title || o.slug}`, `status: ${o.status || "next"}`,
    "updated: 2026-09-01"];
  if (o.parent) fm.push(`parent: ${o.parent}`);
  if (o.depends) fm.push(`depends: [${o.depends.join(", ")}]`);
  fm.push("---", "", "Body.", "");
  return fm.join("\n");
};

// A repo on disk plus the config that points the harvester at it, then the script
// itself. `ROADMAP_ROOT` keeps every written file inside the temp dir, so the run
// cannot touch this checkout's own `data/`.
async function harvest(pucks) {
  const dir = await mkdtemp(join(tmpdir(), "roadmap-harvest-"));
  const repo = join(dir, "local", "demo");
  await mkdir(join(repo, "roadmap"), { recursive: true });
  await mkdir(join(dir, "root", "data"), { recursive: true });
  for (const p of pucks) await writeFile(join(repo, "roadmap", p.slug + ".md"), puck(p));
  await writeFile(join(dir, "root", "sources.json"), JSON.stringify({
    defaultBranch: "main",
    sources: [{ repo: "acme/demo", name: "Demo", color: "#4a8580", adapter: "pucks", path: "roadmap" }],
  }));
  await writeFile(join(dir, "root", "board.config.json"), JSON.stringify({ title: "T" }));
  await exec("node", [join(ROOT, "scripts", "harvest.mjs")], {
    env: { ...process.env, ROADMAP_ROOT: join(dir, "root"), ROADMAP_LOCAL_ROOT: join(dir, "local") },
  });
  const data = JSON.parse(await readFile(join(dir, "root", "data", "roadmap.json"), "utf8"));
  await rm(dir, { recursive: true, force: true });
  const by = {};
  data.items.forEach((i) => { by[i.slug] = i; });
  return by;
}

export async function run() {
  group("rollupen räknar hela trädet");
  {
    // farfar → far → två barnbarn, plus ett direkt barn till farfar. Fyra puckar under
    // roten; två av dem klara.
    const by = await harvest([
      { slug: "rot", status: "now" },
      { slug: "direkt", status: "done", parent: "rot" },
      { slug: "mitten", status: "next", parent: "rot" },
      { slug: "barnbarn-a", status: "done", parent: "mitten" },
      { slug: "barnbarn-b", status: "next", parent: "mitten" },
    ]);
    // Före den här ändringen: 1/2 — de två som namnger roten direkt, och tyst inget
    // alls om de två under `mitten`.
    eq(by.rot.progress, { done: 2, total: 4 },
      `roten räknar hela underträdet, inte sina direkta barn: ${JSON.stringify(by.rot.progress)}`);
    eq(by.mitten.progress, { done: 1, total: 2 }, "och en mellannod räknar sitt eget underträd");
    eq(by["barnbarn-a"].progress, null, "ett löv har ingen rollup alls");

    // Mellannoden räknas *själv* i rotens total. Den är en puck med egen status och egen
    // kropp; att utesluta den vore att göra den till en behållare, vilket är den andra
    // posttyp modellen inte har.
    eq(by.rot.progress.total, 4, "mellannoden är en av de fyra, inte en behållare runt två");

    // Och `children` är fortfarande *direkta* barn — det är relationen filen skriver.
    eq(by.rot.children.length, 2, "children är kvar som de direkta barnen");
    eq(by.mitten.parentRef, "demo/rot", "och kedjan upp är löst");
  }

  group("rollup-signalerna följer det nya måttet");
  {
    // En rot som säger sig klar medan ett *barnbarn* står öppet. Med direkta barn såg
    // den stängd ut; med underträdet är den öppen, vilket är vad signalen finns för.
    const by = await harvest([
      { slug: "rot", status: "done" },
      { slug: "mitten", status: "done", parent: "rot" },
      { slug: "barnbarn", status: "next", parent: "mitten" },
    ]);
    const typer = (s) => (by[s].signals || []).map((x) => x.type);
    ok(typer("rot").indexOf("rollup-open") !== -1,
      `en rot med ett öppet barnbarn flaggas som rollup-open: ${JSON.stringify(typer("rot"))}`);
    eq(by.rot.progress, { done: 1, total: 2 }, "och siffran säger varför");
  }

  group("en cykel kapas och räknas inte");
  {
    // `a → b → a`. Länken som sluter loopen kapas, så resten av trädet löser sig — och
    // en trädvandring som räknar underträd får aldrig loopa.
    const by = await harvest([
      { slug: "a", parent: "b" },
      { slug: "b", parent: "a" },
      { slug: "fri" },
    ]);
    const cyklade = ["a", "b"].filter((s) => (by[s].signals || []).some((x) => x.type === "parent-cycle"));
    ok(cyklade.length > 0, `cykeln flaggas: ${JSON.stringify(cyklade)}`);
    ok(by.a.progress == null || by.a.progress.total < 3, "och ingen rollup räknar sig själv runt loopen");
  }
}
