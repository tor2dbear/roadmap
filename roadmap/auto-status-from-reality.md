---
title: Auto-status från verkligheten
status: next
tags: [core, sync]
updated: 2026-08-15
order: 10
---

## Mål
Ta bort resten av status-adminet: härled status/färskhet från riktiga signaler i
stället för självrapportering.

## Research
- `done` automatiskt när kopplat `issue:` stängs (eller en PR som nämner pucken mergas).
- Flagga en `now`-puck som "kanske vilande" om inga commits rört området på X dagar.
- Kräver att harvestern läser issue/PR-status + senaste commit-datum per puck/område.
  Enklast via GitHub API i harvest-steget (token finns i CI).

## Öppna frågor
- Hur koppla puck → kodområde? Via `tags`, en sökväg i frontmatter, eller `issue:`?
- Auto-ändra status, eller bara *flagga* avvikelser och låta människan bekräfta?
