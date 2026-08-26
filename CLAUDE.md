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
  slug, title, status, priority, tags[], updated, created, target, issue, issueState, order,
  depends[], blockedBy[], blocks[], missingDepends[], parent, parentRef, children[],
  progress, owner, agent, body, sourcePath, sourceUrl, adapter, native, signals[] }`. `owner` is a GitHub handle (or `null`) — thin collaboration, a
  field not an assignee store. `priority` is `urgent`/`high`/`medium`/`low` (or
  `null` = none) — orthogonal to `status` (*when* vs *how much it matters*).
  `target` is `YYYY-MM-DD` (or `null`) — the horizon, a third axis orthogonal to
  both (*when in the calendar* vs *when in the queue* vs *how much it matters*);
  stored exact so it sorts and compares, shown coarsely on the board, and flagged
  by `target-passed` once it's behind us. Not sprints, not estimates.
  `agent` is a discipline handle (or `null`) — the PO-layer routing state (which
  `agents/<name>.md` profile a runner should use); the "queue" is just pucks with
  `agent:` set, read from git — never a scheduler. `depends[]` are the references a puck declares it's blocked by
  (a same-repo slug or `owner/repo#slug`); `blockedBy[]` is the harvester-resolved
  subset of those that aren't settled yet — ids, or the reference as written when it
  resolves to nothing, since an unknown blocker isn't a finished one (empty = ready)
  — `blocks[]` the exact mirror (what this puck holds up) and `missingDepends[]` the references that
  resolved to nothing. Only `depends:` is authored. Read `blockedBy` to find what's
  actually startable. `parent` is
  the etapp as written in the puck (a same-repo slug or `owner/repo#slug`, or `null`);
  `parentRef` is it resolved to an id, `children[]` the ids pointing back, and
  `progress` `{ done, total }` over those children. Only `parent:` is authored — the
  other three are derived at harvest, because a stored `children:` could disagree with
  the `parent:` lines. A puck with children *is* the etapp; there is no second record
  type. `issueState` is
  `"open"`/`"closed"` (or `null`) — the real state of the linked `issue`,
  reconciled at harvest. `created` is `YYYY-MM-DD` (or `null`) — the puck's
  first-commit date, derived from git at harvest (a `created:` frontmatter field
  overrides it); needs full clone history, so the sync clones treeless. `signals[]` are the drift flags (`{ type }`, discrete:
  `stale` / `issue-closed` / `issue-open` / `target-passed` / `parent-missing` /
  `parent-cycle` / `depends-missing` / `dependency-cycle` / `rollup-open` /
  `rollup-done`) — read these to spot cards whose
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
- **`board.config.json`** is the instance's own config — title, description,
  `repoUrl`, and `views[]`: saved views, each a named
  `{ view, q, group, layout, sort, done, empty, collapsed }` — `VIEW_KEYS` in `app.js`,
  the same keys as the URL. All eight: a view that names a built-in scope (`view`) or
  folds groups in the list layout (`collapsed`) carries those too, and listing a subset
  here is how a plan comes to specify a lossy round trip.
  Configuration, not truth (the pucks stay the only data), and hand-editable;
  *Display → Save as view* on the board writes it for you, as a commit.
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
`roadmap tag`, `roadmap issue`, `roadmap target`, `roadmap parent <slug>
<parent-slug>` (etapp membership; `--clear` takes it out), `roadmap depends <slug>
+<ref> -<ref>` (blockers, same `+/-` shape as `tag`), `roadmap move <slug>
--before|--after <slug>` (manual rank), `roadmap renumber` (tidy a column's
`order` back to 10, 20, 30 …), `roadmap list`, `roadmap install-hook` (a
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

## UI: one overlay, two presentations

Every surface — pickers, the filter panel, the Display menu, the date picker, a
one-field prompt — goes through `openSurface()` in `app.js`. It takes the content
and decides the shell: an **anchored popover at ≥640px, a bottom sheet below it**.
The builder writes a list, a calendar or a form once and never learns which it got.
Adding a surface means calling it, never hand-rolling a ninth popover.

Two rules the pucks paid for:

- **Search-and-create only where the value set is open** (labels, pucks). `status`
  and `priority` are closed interface fields: an invented value would commit fine
  and then be dropped by `normalize*()` at the next harvest — a write that looks
  like it worked and vanishes an hour later.
- **The sheet doesn't resize for the keyboard.** It keeps its height and lets the
  keyboard cover the bottom (no reflow, no `visualViewport` listener). What makes
  that correct: the field stays pinned at the top, the first rows sit in the band
  above the keyboard, and the body gets bottom padding *while a text field is
  focused* so the last row can still be scrolled up. Only text fields — padding on
  any `focusin` grew the sheet mid-tap and moved the row out from under the finger.

`window.prompt` is not used anywhere: it hands the dialog to the OS, which on iOS
draws a system sheet in its own shape and colours.

The sheet is draggable — down to dismiss, up to snap to full height — and pins the
page behind it (`body.scroll-locked`, a fixed body at a negative offset, since
`overflow: hidden` doesn't hold on iOS). Two rules that gesture cost: a click that
*began* inside a surface is never an outside click, and the sheet's height is frozen
for the length of a touch, because letting it re-size mid-gesture moves the row out
from under the finger.

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
- **Broken etapp links** — a `parent:` naming a puck that doesn't exist flags
  `parent-missing`; one that closes a loop flags `parent-cycle` and the link is cut
  (the rest of the tree still resolves). Two flags, because they're two different
  fixes — a typo vs a loop.
- **Rollup drift** — an etapp's own status against its parts, the same pair as the
  issue drift: terminal with unfinished children flags `rollup-open` ("2 of 3 parts
  still open"), non-terminal with every child settled flags `rollup-done` ("mark it
  done?"). A puck with no children is never flagged by this rule.
- **Broken dependencies** — a `depends:` entry that resolves to nothing flags
  `depends-missing` (the puck would otherwise read as ready); a dependency loop
  flags `dependency-cycle` on every puck in it. Unlike an etapp parent, no single
  edge can be cut to fix a loop, so all of them stand and a human picks.

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

### PR checks + staging preview

`.github/workflows/pr-preview.yml` runs on every `pull_request` to `main` — it is
the gate + staging that `sync.yml` (deploy-on-push) doesn't provide:

- **Checks (the merge gate):** syntax-checks the board JS and runs the harvester
  (a self-source PR is symlinked to the PR checkout, not a fresh clone of `main`,
  so proposed `roadmap/*.md` are validated). The gate fails on a broken build or
  any `sources[].error`.
- **Staging preview:** `wrangler versions upload --preview-alias pr-<number>` uploads
  a Worker *version* (never touches prod) and posts/updates a **sticky PR comment**
  with a **stable per-PR URL** (`https://pr-<number>-roadmap.<subdomain>.workers.dev`)
  that re-points at the newest version on each push. This is deliberately *not*
  Cloudflare's native Workers-Builds PR comment — that would require reconnecting the
  Git build we keep disconnected; the alias replicates the same UX from CI instead.
- **Runs automatically on all future PRs** once this workflow is on `main`. The
  credentialed preview is gated to owner-authored PRs (`github.repository_owner`) so a
  branch pusher without Cloudflare access can't read the token via PR-controlled
  tooling; non-owner PRs still get the checks.
