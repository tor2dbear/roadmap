#!/usr/bin/env node
// Assemble the generic **Vantage** product tree from this instance repo: the
// reusable engine + UI + docs + templates, with personal config swapped for
// examples. This is the "generated mirror" — run it to create or refresh the
// product repo (tor2dbear/vantage) without maintaining two diverging codebases.
//
//   node scripts/export-product.mjs [outDir]      # default: ../vantage-export
//
// Then, in the product repo: copy outDir over it, commit, push.

import { writeFile, mkdir, cp, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "..", "vantage-export"));

// Verbatim: the generic engine, UI, docs, templates. Nothing here is personal.
const COPY = [
  "scripts/harvest.mjs",
  "scripts/roadmap.mjs",
  "scripts/lib",
  "scripts/sources.schema.json",
  "index.html",
  "app.js",
  "styles.css",
  "CONVENTION.md",
  "AGENTS.md",
  "templates",
  ".assetsignore",
  ".github/workflows/sync.yml",
];

// ── generated files (personal → generic examples) ──
const PKG = {
  name: "vantage",
  version: "0.1.0",
  private: false,
  type: "module",
  description: "Roadmap-as-code — git-native, agent-readable roadmaps in one zero-backend board.",
  bin: { roadmap: "scripts/roadmap.mjs" },
  scripts: {
    harvest: "node scripts/harvest.mjs",
    "harvest:local": "ROADMAP_LOCAL_ROOT=../ node scripts/harvest.mjs",
    roadmap: "node scripts/roadmap.mjs",
    dev: "wrangler dev",
    deploy: "wrangler deploy",
  },
  engines: { node: ">=20" },
  devDependencies: { wrangler: "^4.30.0" },
};

const WRANGLER = `{
  // Static-assets Worker — no build step: the board (index.html + app.js +
  // styles.css + generated data/) is served straight from the repo root, and
  // .assetsignore keeps the engine + config out of the served bundle.
  //
  // Set "name" to your Worker's name. For a custom domain, add a "routes" entry
  // with custom_domain:true (it claims the hostname + DNS on first deploy).
  "name": "vantage",
  "compatibility_date": "2026-08-15",
  "preview_urls": true,
  "assets": { "directory": "." }
  // "routes": [{ "pattern": "roadmap.example.com", "custom_domain": true }]
}
`;

const SOURCES = `{
  // List the repos to harvest. Each needs an adapter:
  //   "pucks"     — native convention (roadmap/*.md). Full fidelity.
  //   "checklist" — bullets under a "## <section>" heading (+ "section").
  //   "prose"     — bullets under a future/"## Vidare" section (+ "section").
  // See CONVENTION.md and README.md → "Deploy your own".
  "defaultBranch": "main",
  "sources": [
    {
      "repo": "your-org/your-repo",
      "name": "Your Repo",
      "color": "#38bdf8",
      "adapter": "pucks",
      "path": "roadmap"
    }
  ]
}
`;

const BOARD_CONFIG = {
  title: "Vantage",
  description: "Roadmap-as-code — one board across your repos, truth in git.",
  repoUrl: "https://github.com/your-org/vantage",
};

const EXAMPLE_PUCK = `---
title: Example puck — delete me
status: now
tags: [example]
updated: 2026-01-01
---

## Goal
One markdown file per roadmap item, under \`roadmap/\`. Edit the frontmatter with
the \`roadmap\` CLI (it bumps \`updated\` for you) or by hand. See CONVENTION.md.
`;

const CLAUDE_MD = `# CLAUDE.md

This is a **Vantage** board — a read-only aggregator. Roadmap truth lives in each
source repo as plain-markdown pucks (\`roadmap/*.md\`); this repo harvests them into
\`data/roadmap.json\` + \`ROADMAP.md\` and renders the board. **Generated files are
never hand-edited.**

Operating the roadmap as an agent: see [\`AGENTS.md\`](AGENTS.md) — the read/write
contract (find what's ready via \`blockedBy\`, update pucks via the \`roadmap\` CLI).
`;

const README = `# Vantage

**Roadmap-as-code.** Your roadmap lives in each repo as plain-markdown *pucks* that
both you and your AI agents read and write — aggregated into one **zero-backend
board**. No SaaS, no lock-in, no second source of truth.

> git-native · agent-readable · deploy-your-own

## Why not Linear / GitHub Projects?

They're team-PM tools; Vantage is a roadmap **layer in your code**. The difference
is structural, not featural:

| | Linear / Projects | **Vantage** |
|---|---|---|
| Truth lives | their cloud / GitHub | **in each repo, in git** |
| Format | proprietary / issues | **plain markdown** |
| Backend | SaaS | **none (static)** |
| Multi-repo | clunky | **core** |
| Agent read/write | via API + keys | **direct (md + JSON + CLI)** |
| Lock-in | yes | **none** |

Vantage deliberately **cedes** real-time co-editing, notifications, sprints, and a
comment feed — that's Linear's turf. Building them would need a second database and
make a worse Linear. The moat is being **git-native and agent-native**.

## How it works

\`\`\`
each repo (roadmap/*.md)  ──harvest──▶  data/roadmap.json · ROADMAP.md
                                              │
                                              ▼
                          index.html + app.js + styles.css  → the board
\`\`\`

## Deploy your own

1. **Fork / use this template.**
2. \`sources.json\` — list your repos. Private repos work with a \`GITHUB_TOKEN\`.
3. \`board.config.json\` — title, description, source link.
4. \`wrangler.jsonc\` — Worker name and (optional) custom domain.
5. Cloudflare → *Workers & Pages → Import a repository* → deploy \`npx wrangler deploy\`.

The hourly Sync Action harvests your repos and redeploys. Nothing to run.

## The convention & the agents

- [\`CONVENTION.md\`](CONVENTION.md) — the puck standard (one markdown file per item).
- [\`AGENTS.md\`](AGENTS.md) — how an agent reads and updates the roadmap (no backend,
  no keys): find what's ready (\`blockedBy\` empty), write via the \`roadmap\` CLI.

## Author pucks

\`\`\`bash
npm link                              # → global \`roadmap\` command
roadmap new "Title" --tags area       # new puck (inbox)
roadmap start|next|later|done <slug>  # move it
\`\`\`
`;

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  for (const rel of COPY) {
    const dest = path.join(OUT, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(path.join(ROOT, rel), dest, { recursive: true });
  }

  const write = async (rel, content) => {
    const dest = path.join(OUT, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, content);
  };

  await write("package.json", JSON.stringify(PKG, null, 2) + "\n");
  await write("wrangler.jsonc", WRANGLER);
  await write("sources.json", SOURCES);
  await write("board.config.json", JSON.stringify(BOARD_CONFIG, null, 2) + "\n");
  await write("README.md", README);
  await write("CLAUDE.md", CLAUDE_MD);
  await write("roadmap/README.md", "<!-- This board's own roadmap. See ../CONVENTION.md. -->\n");
  await write("roadmap/example.md", EXAMPLE_PUCK);

  const files = (await readdir(OUT, { recursive: true })).filter((f) => !f.includes("/") || true).length;
  console.error(`✓ Vantage product tree → ${OUT} (${files} entries)`);
  console.error("  Next: copy it into an empty tor2dbear/vantage repo, commit, push.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
