---
title: "Etapp: tydlighet i GUI:t"
status: now
tags: [ui, product]
updated: 2026-08-24
created: 2026-08-23
order: 5
depends: [ui-primitiv-och-skalor]
parent: gui-hantverk
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

- **Tre fynd som bara riktig data kunde ge.** Efter att repots egna pucks delats i
  tre etapper (`gui-hantverk` 0/5, `gui-editing` 2/2, `productize` 2/3):
  - **`Ready` erbjöd en etapp.** `gui-hantverk` deklarerar inga `depends:` och var
    därför oblockerad — samtidigt som fyra av fem medlemmar väntade på varandra.
    Vyn *agenter läser för att välja arbete* erbjöd det enda man inte kan välja, och
    dolde att innehållet stod stilla. `is:ready` kräver nu också att pucken saknar
    barn: en etapp är inte arbete man plockar upp, det är dess delar som är det.
  - **En etapps status kunde motsäga sina delar utan att någon sa något.**
    `productize` stod `done` med 2/3. Nu två flaggor, samma par och samma skäl som
    issue-driften: `rollup-open` (klar med öppna delar) och `rollup-done` (alla delar
    landade, etappen inte). En puck utan barn träffas aldrig av regeln.
  - **`Contains` listade i slug-ordning.** Harvestern sorterar `children[]` på id
    *"for stable output — the board sorts them for display itself"* och `childItems()`
    sorterade inte. Kommentaren var ett löfte koden inte höll. Nu status → rank →
    titel, alltså den ordning man arbetar dem i.
- **Beslutat: brädet förblir platt.** `all` blir *inte* `-status:inbox -is:member`.
  Skälet är vad en kolumn ska mäta: platt mäter kolumnen **arbetsmängd**, som karta
  hade den mätt **antal initiativ**. Bägge är rimliga, men bara den första svarar på
  frågan man ställer när man tittar på `now`. Och kostnaderna är verkliga — `Ready`
  måste ändå behålla medlemmarna (man plockar upp en medlem, inte en etapp), så de
  två vyerna hade slutat vara delmängder av varandra; "All pucks" hade slutat vara
  alla pucks; och underetapper, som är både etapp och medlem, hade fallit bort.
  `Standalone` ger samma uppdelning som en **lins man går in i och ut ur**, utan att
  låsa fast vad brädet betyder. Det är den billigare formen av samma sak.

- **Titeln är vy-switchen.** Att spara en vy skedde i Display-menyn uppe till höger
  och resultatet dök upp i sidomenyn längst till vänster — bakom en låda på telefon.
  Två hörn för en handling och dess resultat, och koden erkände det: spara-hinten
  *måste* säga "and shows in the sidebar". Bägge bor bakom titeln nu, som redan är
  namnet på vyn man står i. Ett tapp i stället för en låda.
  Raderna kommer från `viewsShown()`, samma anrop sidomenyn gör, så de två listorna
  kan inte säga olika om vilka vyer som finns — driften som gav en palett utan
  Etapps och "All pucks 31 / Standalone 31".
- **Etapp-chippen är en väg dit, inte en etikett.** På ett platt bräde kan ett kort
  och dess etapp ligga kolumner isär, så den enda plats där relationen *står* på
  tavlan gjorde ingenting — den upprepade ett namn med `cursor: help`. Nu en knapp
  som öppnar etappen (och stoppar klicket från kortet under, som öppnar pucken
  själv). Saknas etappen finns ingen chip att klicka på, och då är den text igen.
- **Reponamnet och chippen läste som en fras.** `Etapp ⑂ GUI-hantverk` — det första
  ordet är *repot*, resten är medlemskapet, och meta-raden skiljer sina delar med
  bara ett mellanrum. Chippen bär en egen avdelare på kortet nu. Ett problem som
  bara syns i ett repo som självt heter Etapp, alltså bara med riktig data.
- **En vy har ett antal, inte två.** Sidomenyn pinnade ut arkivet oavsett växeln
  *"so the count doesn't jump"*, så med Show done på sa sidomenyn 2 och vyhuvudet 4
  om samma vy. En siffra som hoppar förklaras av knappen man just tryckte; två olika
  siffror för en vy förklaras aldrig. Räknaren lyder växeln nu, och ett test kräver
  att sidomenyn, vyhuvudet och antalet kort är samma tal i bägge lägena.

## Open questions
- Progressringen (fynd 2) återstår. Den bör vänta tills medlemslistan använts ett
  tag: en ring säger *andel*, och det är först med riktiga etapper man ser om andel
  eller antal är det man faktiskt jämför.
