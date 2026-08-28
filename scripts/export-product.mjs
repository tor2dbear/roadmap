#!/usr/bin/env node
// Assemble the generic **Etapp** product tree from this instance repo: the
// reusable engine + UI + docs + templates, with personal config swapped for
// examples. This is the "generated mirror" — run it to create or refresh the
// product repo (tor2dbear/etapp) without maintaining two diverging codebases.
//
//   node scripts/export-product.mjs [outDir]      # default: ../etapp-export
//
// Then, in the product repo: copy outDir over it, commit, push.

import { writeFile, mkdir, cp, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "..", "etapp-export"));

// Verbatim: the generic engine, UI, docs, templates. Nothing here is personal.
const COPY = [
  "scripts/harvest.mjs",
  "scripts/roadmap.mjs",
  // The bundle guard travels with the deploy it guards. Etapp users follow the
  // generated README straight to `wrangler deploy`, and without this they can publish
  // a stray root file exactly as this repo twice did. It is dependency-free for that
  // reason — the product ships no test runner and no browser.
  "scripts/check-bundle.mjs",
  "scripts/lib",
  "scripts/sources.schema.json",
  "index.html",
  "app.js",
  "styles.css",
  "fonts",
  "CONVENTION.md",
  "AGENTS.md",
  "templates",
  ".assetsignore",
];

// ── generated files (personal → generic examples) ──
const PKG = {
  name: "etapp",
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
    predeploy: "node scripts/check-bundle.mjs",
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
  "name": "etapp",
  "compatibility_date": "2026-08-15",
  "preview_urls": true,
  "assets": { "directory": "." }
  // "routes": [{ "pattern": "roadmap.example.com", "custom_domain": true }]
}
`;

// Must be valid JSON, not JSONC — the harvester and the sync workflow read it
// with strict JSON.parse/require(), which reject // comments. The $schema gives
// editors autocomplete; format guidance lives in README → "Deploy your own".
const SOURCES = `{
  "$schema": "./scripts/sources.schema.json",
  "defaultBranch": "main",
  "sources": []
}
`;

// The default deploy: GitHub Pages — only GitHub required, no other account or
// secret. Cloudflare is an opt-in alternative (see README + wrangler.jsonc).
// NOTE: \${{ ... }} is escaped so it survives this template literal verbatim.
const PAGES_YML = `name: Build & deploy (GitHub Pages)

# Harvests every source repo's roadmap and publishes the board to GitHub Pages —
# only GitHub required, no other account or secret. Enable Pages once
# (Settings → Pages → Source: "GitHub Actions") and every push + hourly run
# redeploys. Custom domain (optional, free): add it under Settings → Pages.
#
# Prefer Cloudflare Workers? Deploy with 'npx wrangler deploy' (wrangler.jsonc)
# and disable this workflow.

on:
  schedule:
    - cron: "17 * * * *"
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - "sources.json"
      - "board.config.json"
      - "roadmap/**"
      - "scripts/**"
      - "index.html"
      - "app.js"
      - "styles.css"
      - "fonts/**"
      - ".github/workflows/pages.yml"

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Clone source repos (treeless, read-only)
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          mkdir -p "$RUNNER_TEMP/sources"
          repos=$(node -e "for (const s of require('./sources.json').sources) console.log(s.repo, s.branch || require('./sources.json').defaultBranch || 'main')")
          while read -r repo branch; do
            [ -z "$repo" ] && continue
            git clone --filter=blob:none --branch "$branch" \\
              "https://github.com/$repo" "$RUNNER_TEMP/sources/$repo" \\
              || git clone --filter=blob:none "https://github.com/$repo" "$RUNNER_TEMP/sources/$repo"
          done <<< "$repos"
      - name: Harvest
        env:
          ROADMAP_LOCAL_ROOT: \${{ runner.temp }}/sources
        run: node scripts/harvest.mjs
      - name: Assemble site (only the board ships)
        run: |
          set -euo pipefail
          mkdir -p _site
          cp index.html app.js styles.css _site/
          [ -d fonts ] && cp -r fonts _site/fonts || true
          [ -f ROADMAP.md ] && cp ROADMAP.md _site/ || true
          cp -r data _site/data
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`;

const BOARD_CONFIG = {
  title: "Etapp",
  description: "Roadmap-as-code — one board across your repos, truth in git.",
  repoUrl: "https://github.com/your-org/etapp",
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

This is an **Etapp** board — a read-only aggregator. Roadmap truth lives in each
source repo as plain-markdown pucks (\`roadmap/*.md\`); this repo harvests them into
\`data/roadmap.json\` + \`ROADMAP.md\` and renders the board. **Generated files are
never hand-edited.**

Operating the roadmap as an agent: see [\`AGENTS.md\`](AGENTS.md) — the read/write
contract (find what's ready via \`blockedBy\`, update pucks via the \`roadmap\` CLI).
`;

const README = `# Etapp

**Roadmap-as-code.** Your roadmap lives in each repo as plain-markdown *pucks* that
both you and your AI agents read and write — aggregated into one **zero-backend
board**. No SaaS, no lock-in, no second source of truth.

> git-native · agent-readable · deploy-your-own

## Why not Linear / GitHub Projects?

They're team-PM tools; Etapp is a roadmap **layer in your code**. The difference
is structural, not featural:

| | Linear / Projects | **Etapp** |
|---|---|---|
| Truth lives | their cloud / GitHub | **in each repo, in git** |
| Format | proprietary / issues | **plain markdown** |
| Backend | SaaS | **none (static)** |
| Multi-repo | clunky | **core** |
| Agent read/write | via API + keys | **direct (md + JSON + CLI)** |
| Lock-in | yes | **none** |

Etapp deliberately **cedes** real-time co-editing, notifications, sprints, and a
comment feed — that's Linear's turf. Building them would need a second database and
make a worse Linear. The moat is being **git-native and agent-native**.

## How it works

\`\`\`
each repo (roadmap/*.md)  ──harvest──▶  data/roadmap.json · ROADMAP.md
                                              │
                                              ▼
                          index.html + app.js + styles.css  → the board
\`\`\`

## Deploy your own — only GitHub needed

1. **Use this template** (or fork).
2. \`sources.json\` — list your repos.
3. \`board.config.json\` — title, description, source link.
4. **Settings → Pages → Source: "GitHub Actions".**

That's it. The included workflow harvests your repos hourly (and on every push) and
publishes to GitHub Pages — no other account, no secrets, nothing to run. A
**custom domain** (optional, free) goes under Settings → Pages.

**Prefer Cloudflare Workers?** Deploy with \`npx wrangler deploy\` (\`wrangler.jsonc\`)
and disable the Pages workflow — the board is the same static bundle either way.

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
  await write(".github/workflows/pages.yml", PAGES_YML);
  await write("wrangler.jsonc", WRANGLER);
  await write("sources.json", SOURCES);
  await write("board.config.json", JSON.stringify(BOARD_CONFIG, null, 2) + "\n");
  await write("README.md", README);
  await write("CLAUDE.md", CLAUDE_MD);
  await write("roadmap/README.md", "<!-- This board's own roadmap. See ../CONVENTION.md. -->\n");
  await write("roadmap/example.md", EXAMPLE_PUCK);

  const files = (await readdir(OUT, { recursive: true })).filter((f) => !f.includes("/") || true).length;
  console.error(`✓ Etapp product tree → ${OUT} (${files} entries)`);
  console.error("  Next: copy it into an empty tor2dbear/etapp repo, commit, push.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
