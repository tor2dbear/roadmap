---
title: "Hierarkin på riktigt: parent, nästling och ordning"
status: done
tags: [ui, product]
updated: 2026-09-11
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

## Utfall

Fem delar, och gapet mellan vad formatet tillåter och vad tavlan visar är stängt:

- **`parent-inte-etapp`** — namnet först. "Etapp" var tavlans ord för nivån ovanför och
  produktens namn på samma gång; `parent` är formatets ord och nu också tavlans.
- **`kolumnhuvudet-ar-en-puck`** — en grupprubrik som *är* en puck ritas som en puck.
- **`nastling-listan-nastlar-tavlan-hinkar`** — listan nästlar; tavlan slutade gruppera
  på parent i stället för att hinka. Regeln blev enklare än planen: **platta facetter
  grupperar tavlan, den enda hierarkin grupperar listan.**
- **`sortering-ar-en-kedja`** — ordningen blev en kedja av nycklar.
- **`gruppering-none-i-listan`** — och ingen gruppering alls, som kedjans motsats.

De två öppna frågorna, besvarade:

- **Visuellt djuptak: ja, men på indraget och inte på trädet.** Nästlingen är obegränsad
  — `parent:` går så djupt någon skriver det, och rader ritas hela vägen ner — medan
  indraget stannar vid 64px (`min(var(--depth) * 16px, 64px)`). Trappan planar alltså ut
  vid fjärde nivån i stället för att gå ut ur en 390px-skärm, och strukturen bärs därifrån
  av caret och föräldrachip. Ett tak på *datan* hade varit att låtsas att formatet har en
  gräns det inte har.
- **Manuell rank behövs — men inte som läge.** Den här pucken bar medvetet inget `order:`
  och lästes ändå i vettig ordning av priority och target, vilket var frågans halva svar.
  Andra halvan kom från `sortering-ar-en-kedja`: `order` är en nyckel bland de andra nu,
  så den kan ligga först (och då dras rader), ligga sist (och då bara bryta lika), eller
  utelämnas. Det som var fel var aldrig rangen utan att den var förvalet *och* det enda.
