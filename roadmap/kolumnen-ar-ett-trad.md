---
title: "Kolumnen är ett träd, inte en nivå"
status: cancelled
tags: [ui]
updated: 2026-09-04
created: 2026-09-02
priority: high
target: 2026-09-21
owner: tor2dbear
parent: nastling-listan-nastlar-tavlan-hinkar
---

## Goal

Tavlans halva av nästlingen: `keyOf` grupperar på roten i stället för på direkt
förälder, så en kolumn blir ett helt träd.

## Avgjord tvärtom: tavlan grupperar inte på parent alls

Frågan pucken ställde — *vilken* hink ska en kolumn vara? — hade ett tredje svar som
ingen av alternativen: **ingen**. Rotkolumner löser dubbleringen men lämnar den fråga
som faktiskt fällde förslaget obesvarad, nämligen om formen är användbar.

**Mätt på den riktiga tavlan**, inte resonerat:

| | kolumner (kort) |
|---|---|
| `?group=parent` | 2 · 3 · **28** |
| med arkivet på | 2 · 7 · 2 · 3 · 5 · **144** |

Av 173 puckar är 19 barn, 5 föräldrar och 150 fristående. 87% hamnar i en enda kolumn
bredvid kolumner med 2–5 kort, i ett rutnät som ger alla kolumner samma bredd. Och det
är inte ett datafel som växer bort: **hierarki är gles av naturen**, de flesta puckar
står inte i något träd. Rotkolumner hade gjort exakt samma fördelning, med färre
kolumner.

De två andra skälen, som mätningen bara bekräftade:

- **Ett träd har nivåer; en kanban-kolumn har inga.** Det stod redan i den här pucken
  som "en egenskap att respektera". Djup via föräldrachippet är en fotnot, inte en form.
- **Tavlans axel är status, och dragandet är dess skrivning.** Grupperar man på parent
  kastar man bort just det som gör en tavla till en tavla, och får tillbaka något listan
  gör bättre på varje punkt: den har djup, den har fler kolumner med metadata per rad,
  och den behåller dragandet som betyder något.

## Vad som blev av det i stället

Regeln: **platta facetter grupperar tavlan, den enda hierarkin grupperar listan.**

`groupUsable` (vad renderaren frågar) och `groupOffered` (vad menyerna frågar) skiljer
sig på exakt den här grupperingen. Menyerna fortsätter erbjuda Parent och `setDisplay`
byter layout med den, synligt — en rad som försvinner beroende på layout lär ingen
någonting. `effectiveParams` släpper `group=parent` när layouten är board, så en länk
säger det som ritas.

Bägge de öppna frågorna ovan besvarades av det:

- **Roten: rubrik eller kort?** Rubrik — men i listan, och det avgjordes i
  `listan-nastlar`.
- **Vad händer med drag-och-släpp?** Den försvinner. `write` är *släpp*-skrivaren, och
  utan föräldrakolumner kan den aldrig utlösas; en skrivare som inte går att nå är en
  förmåga registret påstår och tavlan inte har. Ompappning behåller sina två riktiga
  vägar: `Parent`-fältet i skenan (den enda en telefon kan använda) och `＋ Add puck`.

Det som gick med det, och som är värt att veta innan någon "förenklar": `is:` som
**kolumnterm** går inte längre att observera någonstans — facket och kolumnmenyn var de
enda ställen där `is:member` betydde en kolumn. Grenen i `termAboutGroup` står kvar
därför att `columnExcluded` fortfarande frågar den i listan, inte därför att ett test
kan se den. Tre kontrollgrupper i `tests/facets.test.mjs` gick bort med interaktionen.
