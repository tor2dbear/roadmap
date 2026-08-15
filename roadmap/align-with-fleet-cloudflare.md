---
title: Linjera med fleet-konventionen (Cloudflare + roadmap.tor2dbear.com)
status: now
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

## Kvar (kräver dashboard — kan inte automatiseras headless)
- Cloudflare → Workers & Pages → Create → **Import a repository** → `tor2dbear/roadmap`.
  Projektnamn `roadmap`, prod-branch `main`, tom build, deploy `npx wrangler deploy`,
  branch builds på. Första deployen skapar custom domain + DNS ur `routes`.
- Verifiera att `roadmap.tor2dbear.com` svarar, sen avveckla GitHub Pages.
- Uppdatera fleet-tabellen i `tor2dbear.com/CONVENTIONS.md` (Roadmap-raden → CF).
