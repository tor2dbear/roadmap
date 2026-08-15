# CLAUDE.md — roadmap aggregator

This repo is a **read-only aggregator**. It collects the roadmaps that live in
several source repos and renders one board. The source of truth is **in each
source repo**, never here.

## Where truth lives

- **Per-project roadmap** → in that project's own repo, following
  [`CONVENTION.md`](CONVENTION.md) (the shared standard). PIA
  (`tor2dbear/pia-terminal`) is the reference implementation: `roadmap/*.md`.
- **This repo** → harvests those files and generates a view. Nothing here is
  authored by hand except the aggregator's own code, config, and docs.

To change a roadmap item, edit it **in the source repo** — not here. Editing the
generated files below does nothing lasting; the next sync overwrites them.

## Generated artifacts — do NOT hand-edit

- `data/roadmap.json` — canonical machine-readable aggregate (read this to reason
  about the roadmap programmatically). Shape: `{ generatedAt, statuses, counts,
  total, sources[], items[] }`. Each item: `{ id, repo, repoName, repoColor,
  slug, title, status, tags[], updated, issue, order, body, sourcePath,
  sourceUrl, adapter, native }`.
- `data/roadmap.js` — the same payload as `window.__ROADMAP__`, so `index.html`
  renders from `file://` with no server.
- `ROADMAP.md` — a flat, greppable digest grouped by status.

All three are produced by `scripts/harvest.mjs`. Regenerate; never edit.

## How it works

```
sources.json ──▶ scripts/harvest.mjs ──▶ data/roadmap.json + data/roadmap.js + ROADMAP.md
                      │                                    │
                      ├─ lib/repo.mjs      (fs | GitHub API backend)
                      ├─ lib/adapters.mjs  (pucks | checklist | prose)
                      └─ lib/frontmatter.mjs
                                                           ▼
                                            index.html + app.js + styles.css (board)
```

- **`sources.json`** lists the repos, each with an `adapter`:
  - `pucks` — native convention (full fidelity). `path` = the roadmap dir.
  - `checklist` — best-effort: bullets under a `## <section>` heading of a file
    (`path` + `section`). `✅`/`[x]` → `done`, else `later`. Marked `adapted`.
  - `prose` — best-effort: bullet items under a "future"/`## Vidare` section.
    Marked `adapted`.
- **Backends** (`lib/repo.mjs`): if `ROADMAP_LOCAL_ROOT` points at local checkouts
  it reads from disk (CI clones the repos there — no API limits); otherwise it
  fetches via the GitHub API + raw endpoints (`GITHUB_TOKEN` optional).

## Run it

```bash
node scripts/harvest.mjs                 # fetch sources over the network
ROADMAP_LOCAL_ROOT=/path/to/checkouts \  # or read from local clones
  node scripts/harvest.mjs
python3 -m http.server 4173              # then open the board locally
```

## Authoring helper (`scripts/roadmap.mjs`)

Runs inside a source repo, operates on that repo's `roadmap/`, and edits
frontmatter in place (bumping `updated` on every mutation) so status/date upkeep
is automatic. `roadmap new "Title"`, `roadmap start|next|later|done <slug>`,
`roadmap tag`, `roadmap issue`, `roadmap list`, `roadmap install-hook` (a
pre-commit hook that bumps `updated` on hand edits too). Field edits are
line-level and format-preserving; `STATUSES`/`slugify` are shared with
`lib/adapters.mjs`. An agent can call these commands directly.

## Common tasks

- **Add a repo to the board:** add an entry to `sources.json`. If it follows the
  convention, use `"adapter": "pucks"`. Otherwise use `checklist`/`prose` with a
  `section`, and note it will show as `adapted` until the repo adopts pucks.
- **A source shows as `adapted` and you want full fidelity:** follow the
  migration steps in `CONVENTION.md` (add `roadmap/` pucks to that repo, then
  switch its `sources.json` entry to `pucks`).
- **Change how a status/column behaves:** `STATUSES` in `lib/adapters.mjs`
  (order = column order) and `STATUS_LABEL` in both `harvest.mjs` and `app.js`.

## Sync & deploy

`.github/workflows/sync.yml` runs hourly + on manual dispatch + when the
aggregator's own code changes. It clones the sources, harvests, and commits
changed data back to `main` (so the in-repo JSON/digest stay current for humans
and agents). The data commit is `[skip ci]` so it does not retrigger the
workflow — but it **does** push to `main`.

**Deployment is Cloudflare Workers Builds**, connected to this repo (Pattern B in
`tor2dbear.com/CONVENTIONS.md`; config in `wrangler.jsonc`, served at
`roadmap.tor2dbear.com`). Every push to `main` — including the hourly data
commit — triggers a production deploy, so the board refreshes automatically;
non-`main` branches get preview URLs. There is no build step: the repo root is
the served bundle and `.assetsignore` keeps `scripts/`, config and docs out of
it. (GitHub Pages was the old host — now retired.)
