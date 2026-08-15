---
title: roadmap-CLI — skapa/förädla pucks
status: done
tags: [dx]
updated: 2026-08-15
order: 20
---

## Mål
Göra det trivialt att skapa och flytta pucks utan att röra YAML, och slippa
sköta `updated` för hand.

## Levererat
`scripts/roadmap.mjs`: `new/start/next/later/done/status/tag/issue/touch/list` +
`install-hook`. Varje mutation bumpar `updated`; git-hooken bumpar även vid
handredigering. Formatbevarande radredigering; exponerad som npm-bin (`roadmap`).
