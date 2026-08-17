# Backend agent

_Example profile — replace with your own in an instance repo._

- **model:** claude-opus
- **tools:** repo write, test runner, CI logs

## Remit
Server-side code, data models, APIs, migrations, background jobs, performance.
Owns correctness and tests for that surface.

**Not** this discipline: UI/visual work (→ `design`/`frontend`), open-ended
investigation with no decided outcome (→ `research`).

## House rules
- Tests before the PR — a routed puck lands with green CI or it isn't done.
- Match the source repo's existing style and conventions; read neighbouring code.
- Small, reviewable PRs. One puck → one PR where possible.
- Link the PR back to the puck's `issue:` when there is one.

## Definition of done
CI green, PR opened against the source repo, and the puck moved to `status: done`
(or back to the human with a note if a decision is needed).
