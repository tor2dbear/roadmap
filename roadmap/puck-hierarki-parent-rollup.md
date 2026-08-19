---
title: "Puck-hierarki: parent + rollup"
status: inbox
tags: [core, product]
updated: 2026-08-19
created: 2026-08-19
---

## Goal
Ge tavlan en nivå över pucken — så ett *utfall* (inte bara en lapp) kan ha status
och progress — utan att införa en ny filtyp eller en andra sanning.

## Research
Idag är hierarkin `repo → puck`. Repo är en **deploy-enhet**, inte ett utfall, och
det syns i datan:

- **Taggexplosion = en nivå som försöker födas.** PIA: 51 pucker / **41 distinkta
  taggar**. Méta-Matic: 18 / 16. Taggar grupperar men kan inte bära mål eller status.
- **Etapp har redan epics utan att kunna säga det.** `gui-struktur-v2`,
  `gui-struktur-v3`, `ai-first-gui-cockpit`, `gui-editing`, `keyboard-shortcuts` och
  `markdown-rendering` är *ett* initiativ (cockpit på Linear-nivå). Ingen vy visar
  det som en enhet; "hur långt har vi kommit på cockpiten?" går inte att svara på.
- **Redan noterat:** `gui-struktur-v2` listar "Skalbar sidomeny — Vyer ·
  *(Projekt/Initiatives senare)* · Repos · Discipliner".

Jämförelse: Linear har Initiative → Project → Issue → Sub-issue. Att kopiera fyra
nivåer vore PM-bloat och kräver projekt-objekt med egna metadata → en fil som inte
är en puck → början på en andra sanning.

### Snitt: ett fält, samma primitiv
```yaml
parent: cockpit-linear-niva              # samma repo
parent: tor2dbear/pia-terminal#vfs       # cross-repo, fullt id
```
En puck med barn **är** epicen — ingen ny typ, ingen ny fil. Harvestern deriverar
`children[]` och en rollup (`3/7 done`) precis som den redan deriverar `blockedBy[]`
ur `depends`. Symmetriskt med det som finns, noll ny lagring.

- **Tavlan:** gruppera-på-parent i listvyn, förälder-rad + progress på epic-kortet,
  breadcrumb i detaljen (railen får en `Parent`-rad, som alla andra fält).
- **Skrivväg från dag ett:** `roadmap parent <slug> <parent>` (+`--clear`) och en
  editerbar rad i properties-railen — annars upprepas `depends`-misstaget (ett fält
  som bara går att handredigera används inte; se `beroenden-skrivvag-cross-repo`).
- **Djup:** fältet är självrefererande så godtyckligt djup är gratis, men tavlan
  renderar max två nivåer. Cykelskydd i harvestern.

## Open questions
- Namn: `parent`, `epic` eller `etapp`? (`parent` är neutralt och tål fler nivåer;
  `etapp` är fint men krockar med produktnamnet i dokumentationen.)
- Ska en epic vara en vanlig puck med egen `status`, eller ska status deriveras ur
  barnen? (Förslag: egen status vinner, rollup visas bredvid — annars kan man inte
  parkera en epic vars barn ligger still.)
- Cross-repo-parent kräver att harvestern resolvar över källor — samma maskineri som
  cross-repo `depends`. Bygg båda i ett pass?
- Räcker `parent` för att stoppa taggexplosionen, eller behövs en taggstädning i
  PIA parallellt?
