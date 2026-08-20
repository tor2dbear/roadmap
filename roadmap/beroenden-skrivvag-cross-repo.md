---
title: "Beroenden: skrivväg + cross-repo"
status: next
tags: [core, dx, ai]
updated: 2026-08-20
created: 2026-08-19
order: 40
---

## Goal
Göra `depends` till en funktion man faktiskt kan använda: skrivbar från CLI och GUI,
giltig över repogränser, och synlig som en graf — eftersom `blockedBy[]` är det som
hela agent-erbjudandet vilar på.

## Research
`blockedBy[]` driver **Ready**-vyn och "vad kan jag ta nu?"-receptet i `AGENTS.md`.
Ändå är fältet halvbyggt:

- **Ingen skrivväg.** `scripts/roadmap.mjs` har inget `depends`-kommando (`new`,
  `start/next/later/done`, `tag`, `issue`, `owner`, `priority`, `agent`, `touch`,
  `list`, `install-hook` — inget mer). `app.js` har `commitStatus`, `commitPriority`,
  `commitAgent`, `commitIssue`, `commitTags`, `commitBody`, `commitDelete` — inget
  `commitDepends`. Enda vägen är handredigerad YAML, exakt det konventionen lovar
  att man ska slippa.
  Ett fält som bara går att handredigera blir i praktiken oanvänt — det är samma
  mönster som gjorde `order` osynligt (se `rank-skriv-order-fran-gui-t`).
- **Same-repo only.** Harvestern resolvar bara slugs inom samma källa
  (`puck-dependencies`: "cross-repo via fullt id senare"). På en *tvärrepo*-tavla är
  cross-repo-beroendet precis det man byggde tavlan för — `portability` i etapp beror
  i praktiken på konventionen i workshop, och det går inte att uttrycka.
- **Ingen graf, ingen cykelkoll, ingen kritisk väg.** Allt går att räkna ur datan
  som redan finns.

### Snitt
1. **`roadmap depends <slug> +<slug> -<slug>`** — samma form som `tag`, bumpar
   `updated`. Validera att målet finns; varna vid cykel.
2. **Rad i properties-railen** — `Blocked by` är redan en visad rad; gör den
   editerbar med samma browser-write som status (picker över pucker i samma repo,
   sedan över alla källor när cross-repo finns).
3. **Cross-repo via fullt id** — `depends: [tor2dbear/pia-terminal#vfs]`. Harvestern
   har alla källor i minnet vid resolve; `blockedBy[]` blir bara mindre naiv. Samma
   id-form som `parent` i `puck-hierarki-parent-rollup`.
4. **Cykeldetektering** vid harvest → en `signal` (`dependency-cycle`) i stället för
   ett tyst fel, plus `sources[].error` i PR-gaten om det är grovt.
5. **Graf/kritisk väg (kan vänta)** — "vad blockerar flest" är en sortering, inte en
   ny vy: räkna transitiva beroende-barn per puck.

## Open questions
- Ska en cross-repo-blockare visas som blockerande på tavlan även när källrepot är
  bortfiltrerat i scope? (Förslag: ja — annars ljuger Ready-vyn.)
- Cykel: hård varning i CLI:t (vägra skriva) eller bara en signal vid harvest?
- Behövs `blocks:` (motsatt riktning) eller räcker det att harvestern deriverar det?
  (Förslag: derivera — två fält som kan säga emot varandra är en andra sanning i
  miniatyr.)
