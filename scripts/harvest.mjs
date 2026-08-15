#!/usr/bin/env node
// Harvest every source repo's roadmap into one aggregate, and emit:
//   data/roadmap.json  — canonical machine-readable truth (for tools & agents)
//   data/roadmap.js    — the same payload as `window.__ROADMAP__`, so index.html
//                        renders straight off the filesystem (no server needed)
//   ROADMAP.md         — a flat, greppable digest grouped by status
//
// Backends (chosen per repo in lib/repo.mjs): a local checkout when
// ROADMAP_LOCAL_ROOT points at one, otherwise the GitHub API + raw endpoints.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openRepo } from "./lib/repo.mjs";
import { harvestSource, STATUSES, slugify } from "./lib/adapters.mjs";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const BUILT_AT = process.env.ROADMAP_BUILT_AT || new Date().toISOString();
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

// Real-world signal for auto-status: the open/closed state of a puck's linked
// issue (or PR — the issues endpoint covers both). Returns "open"/"closed", or
// null when there's no signal (unlinked, network down, deleted). Kept discrete
// on purpose: the payload changes only when an issue actually flips state, so it
// doesn't defeat the harvester's idempotency. The board derives the human-facing
// flags (including date-relative staleness) live from this + `updated`.
async function fetchIssueState(repo, issue) {
  try {
    const headers = { "User-Agent": "roadmap-aggregator", Accept: "application/vnd.github+json" };
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
    const res = await fetch(`https://api.github.com/repos/${repo}/issues/${issue}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data.state === "closed" ? "closed" : "open";
  } catch {
    return null;
  }
}

const STATUS_LABEL = {
  now: "Now",
  next: "Next",
  later: "Later",
  inbox: "Inbox",
  done: "Done",
};

function sortItems(a, b) {
  // Manual `order` first (lower = higher), then freshest `updated`, then title.
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  if (a.updated !== b.updated) return (b.updated || "").localeCompare(a.updated || "");
  return a.title.localeCompare(b.title);
}

async function main() {
  const config = JSON.parse(await readFile(path.join(ROOT, "sources.json"), "utf8"));
  const defaultBranch = config.defaultBranch || "main";

  const sources = [];
  const items = [];

  for (const source of config.sources) {
    const branch = source.branch || defaultBranch;
    const repo = await openRepo(source.repo, branch);
    let harvested = [];
    let error = null;
    try {
      harvested = await harvestSource(repo, branch, source);
    } catch (err) {
      error = err.message;
      console.error(`  ! ${source.repo}: ${error}`);
    }

    const short = source.repo.split("/").pop();
    for (const it of harvested) {
      items.push({
        id: `${short}/${it.slug}`,
        repo: source.repo,
        repoName: source.name || short,
        repoColor: source.color || "#888888",
        issueState: null,
        ...it,
      });
    }

    sources.push({
      repo: source.repo,
      name: source.name || short,
      blurb: source.blurb || "",
      color: source.color || "#888888",
      url: `https://github.com/${source.repo}`,
      adapter: source.adapter,
      backend: repo.backend,
      count: harvested.length,
      native: harvested.every((h) => h.native) && harvested.length > 0,
      error,
    });

    console.error(
      `  · ${source.repo} [${source.adapter}/${repo.backend}] → ${harvested.length} items`,
    );
  }

  // Safety: never overwrite a good board with an empty one. If every configured
  // source failed (network down, all backends errored), fail loudly instead of
  // deploying a blank roadmap.
  if (config.sources.length > 0 && items.length === 0) {
    throw new Error(
      "Harvest produced 0 items from " +
        config.sources.length +
        " configured sources — refusing to overwrite existing data. See errors above.",
    );
  }

  // Reconcile pucks that link an issue against its real GitHub state.
  const linked = items.filter((it) => it.issue != null);
  if (linked.length) {
    await Promise.all(
      linked.map(async (it) => {
        it.issueState = await fetchIssueState(it.repo, it.issue);
      }),
    );
    const known = linked.filter((it) => it.issueState).length;
    console.error(`  · reconciled ${known}/${linked.length} linked issue(s)`);
  }

  items.sort(sortItems);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const it of items) counts[it.status] = (counts[it.status] || 0) + 1;

  const payload = {
    generatedAt: BUILT_AT,
    statuses: STATUSES,
    counts,
    total: items.length,
    sources,
    items,
  };

  // Idempotency: if the harvested content is identical to what's already on
  // disk (everything except the timestamp), keep the previous generatedAt so the
  // output is byte-for-byte unchanged. Otherwise the hourly sync would commit a
  // new timestamp every run and spam history with no-op changes.
  const prev = await readJsonIfExists(path.join(ROOT, "data", "roadmap.json"));
  if (prev && sameContent(prev, payload)) {
    payload.generatedAt = prev.generatedAt;
  }

  await mkdir(path.join(ROOT, "data"), { recursive: true });
  await writeFile(
    path.join(ROOT, "data", "roadmap.json"),
    JSON.stringify(payload, null, 2) + "\n",
  );
  await writeFile(
    path.join(ROOT, "data", "roadmap.js"),
    "// Generated by scripts/harvest.mjs — do not edit by hand.\n" +
      "window.__ROADMAP__ = " +
      JSON.stringify(payload) +
      ";\n",
  );
  await writeFile(path.join(ROOT, "ROADMAP.md"), renderDigest(payload));

  console.error(
    `\n✓ ${items.length} items from ${sources.length} repos → data/roadmap.json, data/roadmap.js, ROADMAP.md`,
  );
}

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

// Compare two payloads ignoring the generatedAt timestamp.
function sameContent(a, b) {
  const strip = (p) => JSON.stringify({ ...p, generatedAt: null });
  return strip(a) === strip(b);
}

function renderDigest(payload) {
  const date = payload.generatedAt.slice(0, 10);
  const lines = [
    "# Roadmap — aggregated view",
    "",
    "<!-- GENERATED by scripts/harvest.mjs from the source repos below. Do not edit by",
    "     hand: your changes will be overwritten on the next sync. Edit the roadmap in",
    "     the source repo instead. -->",
    "",
    `_Generated ${date} · ${payload.total} items across ${payload.sources.length} repos._`,
    "",
    "## Sources",
    "",
  ];
  for (const s of payload.sources) {
    const kind = s.native ? "native pucks" : `adapted (${s.adapter})`;
    lines.push(`- **[${s.name}](${s.url})** — ${s.count} items, ${kind}. ${s.blurb}`);
  }
  lines.push("");

  for (const status of payload.statuses) {
    const group = payload.items.filter((it) => it.status === status);
    if (group.length === 0) continue;
    lines.push(`## ${STATUS_LABEL[status]} (${group.length})`, "");
    for (const it of group) {
      const meta = [it.repoName];
      if (it.tags.length) meta.push(it.tags.map((t) => `#${t}`).join(" "));
      if (it.updated) meta.push(it.updated);
      if (it.issue) {
        // Flag issue/status drift (discrete, so the digest stays idempotent).
        if (it.issueState === "closed" && it.status !== "done") meta.push(`⚠ issue #${it.issue} closed`);
        else if (it.issueState === "open" && it.status === "done") meta.push(`⚠ issue #${it.issue} still open`);
        else meta.push(`issue #${it.issue}`);
      }
      if (!it.native) meta.push("_adapted_");
      lines.push(`- **${it.title}** — ${meta.join(" · ")}  `);
      lines.push(`  ${it.sourceUrl}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
