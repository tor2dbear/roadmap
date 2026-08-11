# Roadmap — aggregated across repos

One board for the roadmaps that live in several projects. The truth stays in each
project's own repo as plain markdown; this repo **harvests** it and renders a
visual board — kept in sync automatically.

**Sources today:** [PIA](https://github.com/tor2dbear/pia-terminal) ·
[Cadence](https://github.com/tor2dbear/cadence) ·
[Méta-Matic](https://github.com/tor2dbear/meta-matic)

## Why

- **For you** — a single kanban board (Now / Next / Later / Inbox / Done) across
  all projects, filterable by repo and tag, searchable, with each card linking
  back to its source file.
- **For agents** — `data/roadmap.json` is a machine-readable aggregate and
  `ROADMAP.md` a greppable digest, so an AI can reason about the whole roadmap in
  one read.
- **In sync** — a scheduled GitHub Action re-harvests the sources and redeploys;
  no manual copying, no drift, source repos untouched.

## The standard

Every project describes its roadmap the same way: one markdown file per item (a
**puck**) with YAML frontmatter, under `roadmap/`. The full spec is
**[`CONVENTION.md`](CONVENTION.md)**; a drop-in starter is in
[`templates/`](templates/). PIA is the reference implementation.

A repo that hasn't adopted the convention yet is still included — the aggregator
**adapts** its existing `## Roadmap` checklist or "future" prose section, and
marks those cards `adapted` until the repo migrates to native pucks.

## How it fits together

```
each source repo (roadmap/*.md, or a checklist/prose section)
        │  harvested by scripts/harvest.mjs (per sources.json)
        ▼
data/roadmap.json  ·  data/roadmap.js  ·  ROADMAP.md   (generated)
        │
        ▼
index.html + app.js + styles.css   → the board (GitHub Pages)
```

## Local use

```bash
# Read live from GitHub:
node scripts/harvest.mjs

# …or from local clones (fast, no rate limits):
ROADMAP_LOCAL_ROOT=/path/holding/the/clones node scripts/harvest.mjs

# Then open the board (needs a server because it fetches data/):
python3 -m http.server 4173   # → http://localhost:4173
```

The page also opens straight from `file://index.html` — it reads
`data/roadmap.js` (a global), which works without a server.

## Add a project

Edit [`sources.json`](sources.json):

```jsonc
{
  "repo": "tor2dbear/newthing",
  "name": "New Thing",
  "color": "#34d399",
  "adapter": "pucks",     // native convention …
  "path": "roadmap"
  // … or "adapter": "checklist"/"prose" + "section": "Roadmap" for a repo
  //    that hasn't adopted the convention yet (shows as "adapted").
}
```

## Deploy

The [`Sync roadmap`](.github/workflows/sync.yml) workflow builds and deploys to
GitHub Pages. **One-time setup:** repo *Settings → Pages → Source: GitHub
Actions*. After that it runs hourly and on demand (*Actions → Sync roadmap → Run
workflow*).

## Layout

| Path | What |
|------|------|
| `sources.json` | Which repos to harvest and how. |
| `scripts/harvest.mjs` | The harvester (entry point). |
| `scripts/lib/` | `repo.mjs` (backends), `adapters.mjs`, `frontmatter.mjs`. |
| `CONVENTION.md` | The cross-repo roadmap standard. |
| `templates/` | Drop-in `roadmap/README.md` + `puck.md` for a project. |
| `index.html`, `app.js`, `styles.css` | The board UI. |
| `data/`, `ROADMAP.md` | **Generated** — do not hand-edit. |
