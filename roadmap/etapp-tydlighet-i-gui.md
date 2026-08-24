---
title: "Etapp: tydlighet i GUI:t"
status: now
tags: [ui, product]
updated: 2026-08-23
created: 2026-08-23
order: 5
depends: [ui-primitiv-och-skalor]
---

## Goal
Ge etappen Linears *läsbarhet* utan att köpa Linears *ontologi*.

## Research
Linear är tydligt för att `project` och `issue` är olika objekt med olika namn,
ikoner och sidor. Vår modell är motsatsen — **ett** objekt sett från två håll — och
det är rätt för agenter och git, men det kostar läsbarhet. Allt nedan köper tillbaka
den kostnaden utan att införa en andra posttyp.

Fem fynd, i fallande ordning av hur mycket de skymde:

1. **Etapp och medlem bar samma märke.** `progressBadge` (etappens rollup) och
   `etappChip` (medlemskapet) använde båda `icon("merge")` — samma symbol för
   *innehåller* och *tillhör*, alltså motsatta riktningar. Och `puckGlyph` var
   identisk för alla pucks, så på tavlan gick det inte att se vilket kort som var en
   etapp.
2. **Rollupen var en siffra där en form räcker.** (Avvaktar: se rangordningen.)
3. **`Contains` var en kommaseparerad löptext.** Fungerar för två pucks, kollapsar
   vid åtta.
4. **Brödsmulan lärde inte ut hierarkin.** `All pucks › Logga in` — etappen syntes
   bara som ett fält långt ner.
5. **Relationen gick bara att skapa från barnet.** `parent:` skrivs på medlemmen, så
   från en etapp gick det inte att lägga till pucks.

## Delivered
- **Ett eget glyf för etappen.** Två prickar på ett spår — commit-märket, två
  gånger. Det måste skilja sig vid 12px, vilket är varför det är prickar och inte en
  behållarkontur: en kontur blir en fläck i den storleken, medan ett *antal* prickar
  fortfarande går att läsa. `merge` betyder nu bara medlemskap, och rollup-brickan
  bär etappmärket.
- **Brödsmulan bär etappen.** `All pucks › Auth › Demo · logga-in`. Det lär ut
  strukturen varje gång man öppnar en puck och gör nivån ovanför ett tapp bort i
  stället för en skrollning.
- **`Contains` är en sektion med rader.** Statusprick, titel, egen rollup om
  medlemmen själv är en etapp, och target. Etappsidan är platsen där man *kör*
  etappen, inte bara läser att den finns.
- **`＋ Add puck` från etappens sida.** Relationen är fortfarande authored på barnet
  — `changeParent(vald, etappen)` är samma enfältsskrivning med argumenten omkastade.
  En riktning i datan, två i gränssnittet. Utan medlemmar behåller skenan en tyst
  kontroll, så en etapp går att *starta* uppifrån.
- **Rollupen räknar direkta barn.** Beslutat: det komponerar — varje nivå svarar för
  sitt eget, och en underetapp visar sin egen `N/M` i medlemslistan.

## Open questions
- Progressringen (fynd 2) återstår. Den bör vänta tills medlemslistan använts ett
  tag: en ring säger *andel*, och det är först med riktiga etapper man ser om andel
  eller antal är det man faktiskt jämför.
