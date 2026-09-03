---
title: "Hierarkin på riktigt: parent, nästling och ordning"
status: now
tags: [ui, product]
updated: 2026-09-02
created: 2026-09-02
priority: high
target: 2026-09-30
owner: tor2dbear
---

## Goal

Nivån ovanför en puck finns i formatet men bara halvvägs i tavlan. `parent:` har
**ingen djupgräns** — ett barnbarn går att skapa i dag, med CLI:t eller för hand — och
tavlan renderar det redan, bara fel. Den här etappen (ordet i den svenska meningen, inte i tavlan) stänger gapet mellan vad formatet
tillåter och vad tavlan visar, och rättar namnet på vägen.

## Research

Mätt genom att bygga fallet farfar → far → barnbarn och rendera bägge layouterna:

```
[An etapp]   →  b-member
[b-member]   →  Barnbarnet
[No etapp]   →  …, An etapp, …
```

Tre nivåer plattas till syskonkolumner. Ingenting kraschar, men formen försvinner: ett
barnbarn läser exakt som ett barn, mellanpucken syns två gånger (som kort inne i sin
förälders kolumn *och* som egen kolumnrubrik), och **farfar hamnar i "No etapp"** —
vilket gäller redan vid två nivåer, för varje förälder som saknar egen förälder.
**Kolumnen heter `No parent` sedan `parent-inte-etapp`**, så den halvan läser rätt nu;
utdraget ovan är mätt före bytet.

Rollupen räknar bara direkta barn (`resolveHierarchy()` i `harvest.mjs`), så en rot
skulle visa "2 av 3" och tyst ignorera allt under.

**Varför nu, när inga barnbarn finns:** för att de går att skapa. Frånvaron mäter hur
mycket produkten använts, inte vad den ska klara. Det är inte en funktionsönskan utan
en tavla som ljuger om en struktur formatet tillåter.

## Open questions

- Ska det finnas ett *visuellt* djuptak (tre, fyra nivåer) även om datan inte har ett?
  På 390px blir en djup gren annars en trappa ut ur skärmen.
- Den här etappen bär medvetet **inget `order:`**. Om priority och target räcker för
  att läsa den i vettig ordning är det svaret på om manuell rank behövs alls.
