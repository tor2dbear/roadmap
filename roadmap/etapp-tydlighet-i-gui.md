---
title: "Etapp: tydlighet i GUI:t"
status: now
tags: [ui, product]
updated: 2026-08-24
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

- **Navigationen fick två jobb i stället för ett.** Sidomenyn blandade två sorters
  rad. Nu tre block: **Inbox** överst för sig (ett rum man går till för att *tömma*
  — koden sa det redan, `all` är bokstavligen `-status:inbox`; bara presentationen
  sa något annat), **Views** = utsnittet man valt (All pucks · Etapps · Standalone),
  **Signals** = brädets egen åsikt (Ready · ⚠ Needs attention).
- **`Standalone` — den lösa pucken, som vy.** Predikatet fanns redan som
  `is:orphan`; det saknades bara en dörr till det. Med `is:member` (ny) blir de tre
  lägena kompletta: `is:etapp` + `is:member` + `is:standalone` täcker varje puck, och
  det enda som räknas två gånger är underetapperna — som *är* bägge. `is:standalone`
  är alias för `is:orphan`, så frågespråket säger samma ord som knappen.
  Det här är den billiga vägen till "etapper och lösa pucks som två vyer": `all`
  behöver inte börja ljuga genom att gömma medlemmar, och beslutet om den ska göra
  det kan tas när det finns riktiga etapper att titta på.
- **Vyerna definieras en gång.** `VIEW_DEFS`/`VIEW_GROUPS` läses av både sidomenyn
  och ⌘K-paletten. Innan dess var palettens lista handskriven — och Etapps saknades
  där, en drift som uppstod i samma stund raden lades till i sidomenyn.
- **En rad tjänar sin plats på det den tillför, inte på hierarki i allmänhet.**
  Första försöket grindade både Etapps och Standalone på `counts.etapps`, och
  renderade *All pucks 31 / Standalone 31* — samma lista under två namn, exakt vad
  kommentaren ovanför sa att grinden skulle hindra. Vår enda etapp låg i inkorgen.
  Rätt grind: Etapps visas så snart en etapp finns (den kan ligga i inkorgen, och då
  är vyn enda vägen dit), Standalone bara när den *skiljer sig* från All pucks.
  Hittat genom att titta på den renderade sidomenyn, inte i koden.

## Open questions
- Ska `all` bli `-status:inbox -is:member` — alltså brädet som karta, en etapp som
  ett kort? Det ändrar vad man *ser*, inte bara vad man kan *fråga efter*: `now`
  tappar arbete (medlemmar), `Ready` måste behålla dem, och "All pucks" slutar vara
  alla pucks. Avvaktar tills det finns en riktig etapp med fyra–sex medlemmar; idag
  skulle ändringen påverka ett kort, och en strukturregel beslutad på ett urval av
  ett är en regel man river upp.
- Sparade vyer bär redan sin basvy i tupeln (`view`; saknas den = `all`), men
  sidomenyn använder inte det. Kandidat: gör *vytiteln* till switchen — den renderas
  redan på båda bredder — och lägg inbyggda + sparade vyer i samma `openSurface`,
  tillsammans med `Save as view`. Då bor handlingen och dess resultat på samma ställe.
- Progressringen (fynd 2) återstår. Den bör vänta tills medlemslistan använts ett
  tag: en ring säger *andel*, och det är först med riktiga etapper man ser om andel
  eller antal är det man faktiskt jämför.
