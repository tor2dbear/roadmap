# CLAUDE.md — roadmap aggregator

This repo is a **read-only aggregator**. It collects the roadmaps that live in
several source repos and renders one board. The source of truth is **in each
source repo**, never here.

**Operating the roadmap as an agent:** [`AGENTS.md`](AGENTS.md) is the
agent-agnostic read/write contract (find what's ready via `blockedBy`, update
pucks via the CLI). This file adds Claude-Code-specific detail on top.

## Where truth lives

- **Per-project roadmap** → in that project's own repo, following
  [`CONVENTION.md`](CONVENTION.md) (the shared standard). PIA
  (`tor2dbear/pia-terminal`) is the reference implementation: `roadmap/*.md`.
- **This repo** → harvests those files and generates a view. Nothing here is
  authored by hand except the aggregator's own code, config, and docs.

To change a roadmap item, edit it **in the source repo** — not here. Editing the
generated files below does nothing lasting; the next sync overwrites them.

## Product direction — keep the USP intact

The USP is **roadmap-as-code**: truth lives in each repo as plain-markdown pucks
that both humans and AI agents read and write; the board is a zero-backend
aggregator. When closing gaps against tools like Linear / GitHub Projects, one
rule preserves that:

> **Write through to git/markdown (or lean on GitHub primitives). Never introduce
> a second source of truth.**

- **Close the git-native way:** GUI editing writes back `roadmap/<slug>.md` via a
  thin `api/`-Worker (a pen, not a store); portability = config-driven,
  deploy-your-own; agent-nativeness = the moat, double down.
- **Close thin, via GitHub:** discussion = the linked `issue`; ownership = an
  `owner:` frontmatter field; permissions = git/PR review.
- **Deliberately cede (Linear's turf):** real-time co-editing, push notifications,
  sprints/story points, a rich comment/activity feed. Building these makes a worse
  Linear and erodes the USP.

Test for any new feature: if it needs a second database (comments, assignees,
realtime state), it's the wrong shape for this product. The self-roadmap pucks
tagged `product` track this direction.

## Generated artifacts — do NOT hand-edit

- `data/roadmap.json` — canonical machine-readable aggregate (read this to reason
  about the roadmap programmatically). Shape: `{ generatedAt, statuses, counts,
  total, sources[], items[] }`. Each item: `{ id, repo, repoName, repoColor,
  slug, title, status, priority, tags[], updated, created, issue, issueState, order,
  depends[], blockedBy[], owner, agent, body, sourcePath, sourceUrl, adapter, native,
  signals[] }`. `owner` is a GitHub handle (or `null`) — thin collaboration, a
  field not an assignee store. `priority` is `urgent`/`high`/`medium`/`low` (or
  `null` = none) — orthogonal to `status` (*when* vs *how much it matters*).
  `agent` is a discipline handle (or `null`) — the PO-layer routing state (which
  `agents/<name>.md` profile a runner should use); the "queue" is just pucks with
  `agent:` set, read from git — never a scheduler. `depends[]` are the same-repo slugs a puck declares it's blocked
  by; `blockedBy[]` is the harvester-resolved subset of those that aren't `done`
  yet (empty = ready). Read `blockedBy` to find what's actually startable. `issueState` is
  `"open"`/`"closed"` (or `null`) — the real state of the linked `issue`,
  reconciled at harvest. `created` is `YYYY-MM-DD` (or `null`) — the puck's
  first-commit date, derived from git at harvest (a `created:` frontmatter field
  overrides it); needs full clone history, so the sync clones treeless. `signals[]` are the drift flags (`{ type }`, discrete:
  `stale` / `issue-closed` / `issue-open`) — read these to spot cards whose
  declared status disagrees with reality.
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

## Auto-status signals

So status upkeep isn't purely self-reported, the board flags pucks whose declared
status disagrees with reality (it never rewrites the source — truth stays in the
puck; drift is surfaced so a human fixes it with the `roadmap` CLI):

`harvest.mjs` computes the flags centrally into each item's `signals[]` (discrete
types, so the payload only changes when a flag flips — idempotency holds), and
`ROADMAP.md` gets a "⚠ Needs attention" section. The board and any agent read the
same `signals`, so there's one source of truth for the flag decision.

- **Issue drift** — reconciles each puck's `issue:` against its real GitHub state
  into `issueState`, then flags `closed` + not `done` ("mark done?") and `open` +
  `done` ("issue still open").
- **Staleness** — a `now` puck untouched > 21 days, or `next` > 60, gets a `stale`
  flag. Thresholds: `STALE_DAYS` in `harvest.mjs`. The board turns the flag into a
  live "N days" string for display.

Flagged cards get a ⚠ badge + note; a "⚠ Needs attention" filter shows only them
(including flagged `done` items).

## Sync & deploy

`.github/workflows/sync.yml` runs hourly + on manual dispatch + when the
aggregator's own code or config changes. In **one job** it clones the sources,
harvests `data/` fresh, and deploys straight to Cloudflare with `wrangler deploy`.
The data is built in CI and served from that run — it is **not committed back**,
so there are no generated files in git, no idempotency logic, and no `[skip ci]`
traps. (The tradeoff: the in-repo `data/roadmap.json` is a frozen snapshot, not
live — agents wanting current data read the deployed `roadmap.json` URL; primary
truth is still the per-puck markdown in the source repos anyway.)

**Deployment is `wrangler deploy` from CI** (Pattern B in
`tor2dbear.com/CONVENTIONS.md`; config in `wrangler.jsonc`, served at
`roadmap.tor2dbear.com`). It needs two GitHub secrets — `CLOUDFLARE_API_TOKEN`
(an "Edit Cloudflare Workers" token, this account + the `tor2dbear.com` zone) and
`CLOUDFLARE_ACCOUNT_ID` — and the Worker's own Cloudflare **Git build must stay
disconnected** (else it redeploys the stale committed data over CI's fresh one).
There is no build step: the repo root is the served bundle and `.assetsignore`
keeps `scripts/`, config and docs out of it. (GitHub Pages, then Cloudflare
Workers Builds, were the old hosts — both now retired.)
