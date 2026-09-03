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
  one read. **[`AGENTS.md`](AGENTS.md)** is the read/write contract: how to find
  what's ready (`blockedBy` empty) and update pucks via the CLI — no backend, no
  keys.
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

## Deploy your own

The board is **config-driven** — point it at your repos, no code changes:

1. **Fork** this repo.
2. **[`sources.json`](sources.json)** — list your repos (`repo`, `name`, `color`,
   `adapter`). See *Add a project* below. Private repos work too — add a
   `GITHUB_TOKEN` secret.
3. **[`board.config.json`](board.config.json)** — set `title`, `description`, and
   `repoUrl` (link back to your fork). Everything owner-specific lives here, not in
   the code. Add `views[]` here for saved views, or build one on the board and
   use **Save view** in the filter chip row (also behind the view title, and in ⌘K).
   It writes this file for you, as a commit.
4. **[`wrangler.jsonc`](wrangler.jsonc)** — set `name` (your Worker) and, for a
   custom domain, `routes`.
5. **Cloudflare** — Workers & Pages → *Import a repository* → your fork, deploy
   command `npm run deploy`, production branch `main` (exact settings under
   *Deploy*).

That's it — the hourly Sync Action harvests your repos and redeploys. No backend,
nothing to run.

## How it fits together

```
each source repo (roadmap/*.md, or a checklist/prose section)
        │  harvested by scripts/harvest.mjs (per sources.json)
        ▼
data/roadmap.json  ·  data/roadmap.js  ·  ROADMAP.md   (generated)
        │
        ▼
index.html + app.js + styles.css   → the board (Cloudflare Worker)
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

## Author pucks without touching YAML

`scripts/roadmap.mjs` is a small helper so you never hand-maintain frontmatter.
It runs **inside a project repo** and writes to that repo's `roadmap/`. Every
command bumps `updated` for you.

```bash
# make it a global command (once), from this repo:
npm link            # → `roadmap` available everywhere

# then, inside any project:
roadmap new "Multi-buffer i nano" --tags editor   # create a puck (in inbox)
roadmap start nano-multi-buffer                    # → status: now
roadmap next|later|done <slug>                     # move it
roadmap tag <slug> +text -ui                       # edit tags
roadmap issue <slug> 42                            # link a working issue
roadmap parent <slug> <parent-slug>                 # put it in a parent (--clear to take it out)
roadmap depends <slug> +blocker -old               # edit blockers (--clear to remove all)
roadmap list [--status now]                        # quick overview
roadmap install-hook                               # auto-bump `updated` on commit
```

`install-hook` adds a pre-commit hook to the current repo that refreshes
`updated` on any puck you edit by hand — so status/date upkeep is automatic
whether you use the helper or just edit the file. (No global install? Use
`node /path/to/roadmap/scripts/roadmap.mjs …` or `npm run roadmap -- …`.)

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

Hosting follows the fleet convention ([`tor2dbear.com/CONVENTIONS.md`](https://github.com/tor2dbear/tor2dbear.com/blob/main/CONVENTIONS.md)):
a static-assets **Cloudflare Worker** (Pattern B, config in [`wrangler.jsonc`](wrangler.jsonc)),
served at **`roadmap.tor2dbear.com`**. No build step — the repo root is the
bundle; [`.assetsignore`](.assetsignore) keeps `scripts/`, config and docs out.

- **Content freshness:** the [`Sync roadmap`](.github/workflows/sync.yml) Action
  harvests hourly (+ on demand / on code push) and commits changed `data/` to
  `main`. Every push to `main` triggers a Workers Build, so the board redeploys
  with fresh data automatically. Code changes get preview URLs and the
  merge-to-`main` flow.
- **Sync now:** the footer's `sync now` button (and `Sync now` in ⌘K) dispatches that
  same Action from the board and reloads when it lands — for the case the schedule
  cannot cover, an edit in a *source* repo that you want on the board immediately.
  Needs `Actions: write` on this repo in your token. The button shows for any token —
  the permission cannot be pre-flighted — so a token without it draws the button and
  says so on press. `syncWorkflow` / `syncBranch` in `board.config.json` point it
  elsewhere, and `"syncWorkflow": false` removes it.
- **One-time setup (Cloudflare dashboard):** *Workers & Pages → Create
  application → Import a repository* → `tor2dbear/roadmap`. Project name
  `roadmap` (must equal `name` in `wrangler.jsonc`), production branch `main`,
  build command empty, deploy command `npm run deploy` (not bare `wrangler` — the
  npm script carries the bundle guard), branch builds on.
  The first deploy claims `roadmap.tor2dbear.com` and its DNS record from
  `routes` (an existing `A`/`AAAA`/`CNAME` on that name would block it).

## Layout

| Path | What |
|------|------|
| `sources.json` | Which repos to harvest and how. |
| `board.config.json` | Board title, description, source link, and saved views (deploy-your-own). |
| `scripts/harvest.mjs` | The harvester (entry point). |
| `scripts/lib/` | `repo.mjs` (backends), `adapters.mjs`, `frontmatter.mjs`. |
| `CONVENTION.md` | The cross-repo roadmap standard. |
| `templates/` | Drop-in `roadmap/README.md` + `puck.md` for a project. |
| `index.html`, `app.js`, `styles.css` | The board UI. |
| `data/`, `ROADMAP.md` | **Generated** — do not hand-edit. |
| `wrangler.jsonc`, `.assetsignore` | Cloudflare Worker deploy config. |
| `roadmap/` | This repo's own roadmap pucks (it's a source too). |
