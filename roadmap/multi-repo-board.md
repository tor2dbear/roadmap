---
title: Multi-repo roadmap-aggregator + tavla
status: done
tags: [core]
updated: 2026-08-15
order: 10
---

## Mål
Samla roadmaps från flera repon till ett bräde + en maskinläsbar aggregat, i synk.

## Levererat
Harvester (`scripts/harvest.mjs` + `lib/`) med fs/GitHub-backends och adaptrar
(pucks/checklist/prose). Genererar `data/roadmap.json` (för AI), `data/roadmap.js`
(file://-tavla) och `ROADMAP.md`. Statisk kanban-vy (`index.html`/`app.js`), och en
GitHub Action som skördar per timme + vid push och committar färsk data.
Idempotent — committar bara vid faktisk ändring. Deploy via Cloudflare
(se `align-with-fleet-cloudflare`); board på roadmap.tor2dbear.com.
