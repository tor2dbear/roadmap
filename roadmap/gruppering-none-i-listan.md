---
title: "Ingen gruppering alls i listan"
status: later
tags: [ui]
updated: 2026-09-02
created: 2026-09-02
priority: low
target: 2026-09-30
owner: tor2dbear
parent: hierarkin-pa-riktigt
depends: [sortering-ar-en-kedja]
---

## Goal

`group=none` i listlayouten: en platt lista utan rubriker.

## Research

Koden är redan byggd för det. Tre hjälpfunktioner som frågar om grupperingen öppnar med
`if (!g.field) return …` — `columnTerm`, `termAboutGroup`, `groupConstrained` — så en
grupp *utan fält* är en form filen redan förutser. Varje valfri medlem är vaktad:
`g.cls`, `g.tint`, `g.headExtra`, `g.write`. Det mekaniska är en post i `GROUPS` plus
att `groupUsable("none")` bara svarar ja i listan; `effectiveGroup()` finns exakt för
att falla tillbaka i tavlan.

**Två beslut som är design och inte kod:**

- **Rubriken måste bort — men då tystnar arkivet.** Regeln är att arkivet säger vad det
  håller tillbaka i huvudet på den kolumn som saknar det. Utan huvud blir dolda
  done-puckar tysta igen, vilket är precis buggen regeln skrevs för. Svaret som passar
  in: rita huvudet *bara* när arkivet har något att säga, och låt det bära enbart
  märket.
- **Sorteringen blir hela strukturen**, och därför beror den här på kedjesorteringen:
  `order` sätts per statuskolumn, så platt kolliderar varje kolumns 10 med varje annan
  kolumns 10. Utan en riktig sortering är en platt lista en godtycklig ordning.

## Open questions

- Ska `group=none` ärva den senaste sorteringen, eller föreslå en egen när man slår på
  den? Det förra är förutsägbart, det senare är hjälpsamt precis en gång.
