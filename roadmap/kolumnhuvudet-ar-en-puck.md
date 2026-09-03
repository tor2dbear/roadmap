---
title: "Kolumnhuvudet är en puck, inte en etikett"
status: now
tags: [ui]
updated: 2026-09-02
created: 2026-09-02
priority: high
target: 2026-09-08
owner: tor2dbear
agent: design
parent: hierarkin-pa-riktigt
---

## Goal

Under `group=parent` är kolumnrubriken namnet på en riktig puck — men den går inte att
öppna, och en lång titel spränger huvudet. Två fel med ett gemensamt svar.

## Research

**Rubriken är inert.** I `renderColumns` är den `el("h2", null, grp.label)` — ren text,
ingen kontroll. Överallt annars på tavlan öppnar en pucks namn den: korttiteln,
föräldrachippet på ett kort (`.etapp-link` är en knapp), brödsmulan. `group=parent` är
det enda stället regeln bryts — och det är stället där föräldern annars **inte finns på
skärmen** alls: den ligger i "No etapp" eller i sin egen förälders kolumn.

**Långa titlar bryter layouten.** `.col-head` är `display: flex; align-items: center`
utan `min-width: 0` och utan trunkering på `h2`, så en lång titel radbryts och räknaren
och rollup-brickan centreras mot ett treradigt block. Mätt: `Brand it + split product /
instance` är 35 tecken, `Redigera pucks direkt i GUI:t` 29.

**Bara `parent` producerar godtyckligt långa etiketter.** Status, repo, agent, priority
och target är korta av konstruktion. Defekten kom alltså med parent-grupperingen, och
den blir värre med nästling.

**Den billigare halvan av fixen är inte trunkering.** `.col-head h2` bär
`text-transform: uppercase` och `letter-spacing: var(--tr-eyebrow)` — rätt för en
kategorietikett (`NOW`, `ETAPP SITE`), fel för en titel. Versaler plus spärrning kostar
15–20 % bredd och läsbarhet: `BRAND IT + SPLIT PRODUCT / INSTANCE` är både längre och
svårare att läsa än `Brand it + split product / instance`. Gör bägge och långa namn
slutar vara vardag; trunkeringen blir ett skyddsnät i stället för ett tillstånd.

**Och de två fixarna hänger ihop:** trunkering är bara försvarbar för att namnet går att
öppna. På telefon finns ingen hover, så `title=` är inget svar i sig.

## Open questions

- **Listan har en krock.** Där är rubriken redan hopfällningskontrollen (`.lh-toggle`),
  hela raden. Förslag: chevronen blir hopfällningen och namnet blir länken — två olika
  handlingar, inte det överflödiga andra målet som sidofältsregeln varnar för. Men det
  gör en rad till två träffytor och behöver ses på telefon.
- Ska kolumnen breddas för långa namn i stället? Nej enligt mig — fast bredd är vad som
  gör en kanban skannbar. Skrivet här för att någon annars föreslår det.
