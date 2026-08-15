---
title: Linjera med fleet-konventionen (Cloudflare + roadmap.tor2dbear.com)
status: next
tags: [hosting, ops]
updated: 2026-08-15
order: 5
---

## Mål
Flytta roadmap från GitHub Pages till Cloudflare enligt `tor2dbear.com/CONVENTIONS.md`
(Cloudflare är house-standard; roadmap var listad som "to move to CF").

## Levererat
- `wrangler.jsonc` (Pattern B, static-assets Worker, ingen build) som claimar
  `roadmap.tor2dbear.com` via `routes`.
- `.assetsignore` som håller `scripts/`, config och docs ur bundeln.
- `wrangler` pinnad i `package.json` + `dev`/`deploy`/`versions:upload`-scripts.
- Workflowen deployar inte längre till Pages — den skördar och committar data till
  `main`; varje push till `main` (inkl. datacommits) triggar en Workers Build.
- `.nojekyll` borttagen; docs uppdaterade.
- **Workers Build importerad i dashboarden; `roadmap.tor2dbear.com` live och
  serverar färsk data.** ✅

## Kvar
- Avveckla GitHub Pages (Settings → Pages → None).
- Uppdatera fleet-tabellen i `tor2dbear.com/CONVENTIONS.md` (Roadmap-raden → CF).
