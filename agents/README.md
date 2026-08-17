# `agents/` — discipline profiles (the PO-layer)

This folder is the **agent side** of the roadmap-as-code model. The board lets a
human act as **PO** and *route* a puck to a discipline; this folder says what each
discipline **is**. Truth stays in git — no orchestration engine, no queue service.

## How routing works (thin, git-native)

1. **Route** — a puck gets an `agent:` field in its frontmatter (via the board's
   Agent picker, or `roadmap agent <slug> <discipline>`). That's the whole dispatch:
   a field written to git.
2. **Profile** — this folder holds one file per discipline: `agents/backend.md`,
   `agents/design.md`, … Each describes the role's remit, tools, model, and house
   rules for that kind of work.
3. **Runner** — a scheduled **Claude Code** run (a cron in your instance repo, not
   a service here) reads the deployed `roadmap.json`, finds pucks where `agent:` is
   set and `status` is actionable, loads the matching profile, does the work in the
   *source* repo, and opens a PR. The "queue" is simply *pucks with an `agent:`* —
   read from git each run. Nothing is scheduled or stored a second time.

```
board / CLI ──▶ writes  agent: backend   in roadmap/<slug>.md   (dispatch = a commit)
                              │
roadmap.json  ◀── harvest ────┘
     │
  runner (Claude Code cron)  ── reads pucks with agent: set
     ├─ loads agents/backend.md  (role, tools, model, rules)
     └─ does the work in the source repo → opens a PR
```

## What a profile looks like

A profile is plain markdown a person and an agent both read. Recommended shape
(drop what you don't need):

```markdown
# Backend agent

- **model:** claude-opus (or your instance's choice)
- **tools:** repo write, test runner, CI logs

## Remit
What this discipline owns — and, importantly, what it does NOT.

## House rules
Conventions to follow (style, tests-before-PR, commit/PR format, …).

## Definition of done
When a puck routed here counts as finished (green CI, PR opened, `status: done`).
```

See [`backend.md`](backend.md) and [`design.md`](design.md) for worked examples.
These ship as **templates** — in your own instance repo, replace them with real
profiles for your team's disciplines.

## Deliberately NOT here (USP guard)

- **No scheduler / queue / dispatcher.** The queue is `agent:` + `status`, read
  from git. Adding a real queue would be a second source of truth.
- **No per-agent activity store.** An agent's trail is its **commits and PRs** —
  the same git history the board's Activity tab already reads.
- **No assignee database.** `agent:` is a routing field, like `owner:` — not a
  people-management system.
