---
title: Auto-status från verkligheten
status: done
tags: [core, sync]
updated: 2026-08-15
order: 10
---

## Mål
Ta bort resten av status-adminet: härled status/färskhet från riktiga signaler i
stället för självrapportering.

## Beslut
**Flagga, ändra inte automatiskt.** Aggregatorn är read-only mot källrepona och
kan inte skriva om en pucks `status` där — och även om den kunde vore det fel att
låta board:en divergera från källan. I stället *ytar* den avvikelser så att en
människa rättar i pucken med `roadmap`-CLI:t. Sanningen bor kvar i pucken.

## Levererat
- **Issue-avstämning:** `harvest.mjs` läser varje pucks `issue:` mot GitHub och
  lagrar `issueState` (`open`/`closed`/`null`). Diskret → bryter inte idempotensen.
- **Flaggor i board:en (`app.js`):**
  - `closed` + inte `done` → "issue stängd — markera done?"
  - `open` + `done` → "done men issue öppen"
  - `now`/`next`-puck orörd > 21/60 dagar (räknat live ur `updated`) → "fortfarande aktiv?"
- ⚠-badge + notis på kort, ett "⚠ Needs attention"-filter (visar även flaggade
  `done`), och inline-markering i `ROADMAP.md`. Trösklar: `STALE_DAYS` i `app.js`.

## Möjlig uppföljning (ej i v1)
- Koppla puck → kodområde (sökväg i frontmatter) och flagga `now` utan commits i
  området på X dagar — starkare "vilande"-signal än enbart `updated`.
