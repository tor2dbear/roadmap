---
title: "Kolumnen är ett träd, inte en nivå"
status: now
tags: [ui]
updated: 2026-09-03
created: 2026-09-02
priority: high
target: 2026-09-21
owner: tor2dbear
parent: nastling-listan-nastlar-tavlan-hinkar
---

## Goal

Tavlans halva av nästlingen: `keyOf` grupperar på roten i stället för på direkt
förälder, så en kolumn blir ett helt träd.

## Research

Kolumner kan inte nästlas, och det är inte ett problem att lösa utan en egenskap att
respektera. En kanban-kolumn är en hink; frågan är bara *vilken* hink. "Direkt
förälder" ger en kolumn per nivå, vilket är därför tre nivåer blir tre syskonkolumner
utan synlig släktskap. "Rot" ger en kolumn per träd, vilket är den enda hinken som är
sann oavsett djup.

Djupet flyttar till kortet: föräldrachippet, som redan finns och redan är byggt för att
öppna föräldern.

## Open questions

- **Roten: rubrik eller kort?** Är rubriken puckens enda plats blir den nödvändigtvis
  klickbar (se `kolumnhuvudet-ar-en-puck`), och ingen dubblering uppstår. Men då
  behandlas två föräldrar olika: roten som rubrik, mellanpucken som kort. Alternativet
  är roten som första kort i sin egen kolumn, med dubblering av namnet.
- Vad händer med drag-och-släpp? `g.write` skriver `parent:` — släpper man ett kort i
  en trädkolumn blir det barn till *roten*, inte till noden man siktade på. Antingen är
  det svaret, eller så tappar trädkolumnerna sin skrivfunktion.
