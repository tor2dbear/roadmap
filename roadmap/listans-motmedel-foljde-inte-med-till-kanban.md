---
title: Listans motmedel följde inte med till kanban
status: done
tags: [ui]
updated: 2026-09-12
created: 2026-09-12
priority: medium
owner: tor2dbear
depends: [varje-kolumn-skrollar-for-sig]
parent: skroll-isoleras-till-en-axel
---

## Goal

Kanbanporten blev tvåaxlig när `bradans-egen-scrollruta` gav brädan en port. Listan har
sedan länge tre motmedel mot exakt det — axellås, ingen sidledsstuds, gömda indikatorer —
och inget av dem följde med ner. Det här är den ena meningen, inte tre pucker.

## Research

**Axellåset saknas, och det är mätt** (390×844, rapportens egen bredd):

```
              touch-action        overscroll-x   skrollar
kanban  .port  auto               auto           x + y
lista   .work  pan-y pinch-zoom   none           x + y
```

De tre CSS-reglerna är scopade `.work:has(> .port > .board.as-list)` — medvetet precist,
och därför listans ensamma. En lodrät svep i kanban med några graders drift flyttar alltså
kolumnerna i sidled också, vilket är precis det `armAxisLock` skrevs för.

**Och koden ser ut att täcka bägge, vilket är värre än att sakna den.** `armAxisLock(workEl)`
armas oavsett layout och driver `port.scrollLeft` — men porten den fick är `.work`, som i
kanban inte skrollar alls (mätt ovan: `x: false, y: false`). Den är alltså **inert**, inte
frånvarande. En regel som ser ut att gälla en layout den inte når är samma sorts fel som
`.col-head`s sticky-kommentar var: den läses som sann.

`armAxisLock`s egen kommentar säger att låset är *listans* och att `.work` **är** porten
där — vilket stämde när den skrevs och är hälften av sanningen nu.

**Indikatorerna är den andra halvan, och den har ingen mätning.** `bradans-egen-scrollruta`
lämnade den öppen ordagrant: listan gömmer sina under `(pointer: coarse)` eftersom en
tvåaxlig port ritar dem illa — stapeln under de klibbiga rubrikerna, en snärt nedåt som
blinkar till den vågräta. Den regeln skrevs från en enhetsrapport; den här har ingen, och
att bredda den på symmetri vore precis den omätta svepning arkivmärkets vakt togs bort för.
Så: mät på en riktig telefon innan något skrivs, eller lämna den.

**Arbetets storlek beror på blockeraren, och den kan radera det helt.** Med scroll per
kolumn (`varje-kolumn-skrollar-for-sig`) blir `.port` enaxlig i sidled och `.cards` enaxlig
i höjdled — två nästlade enaxliga lådor, som webbläsaren hanterar själv. Då finns ingenting
att bygga: inget lås, ingen studs att stänga av, och indikatorerna ritas normalt igen.
Utan den formen är det `armAxisLock` på `.port` plus scopa om de tre reglerna.

Det är därför `depends:` och inte `parent:`. Defekten finns i den layout som ligger ute och
är inte en del av ett förslag — men den ska inte startas förrän förslaget är avgjort, för
svaret avgör om den har något innehåll.

## Open questions

- **Vad räknas som en lyckad mätning av driften?** Listans regel kostade en lärdom värd att
  återanvända: en syntetisk gest mäter aritmetiken, inte mekanismen, och Chromium låser
  axeln själv upp till ~36° — bara en brantare diagonal (mätt: 352px drift vid 42°) skiljer
  regeln från dess frånvaro. Samma vinkel gäller här.
- **Ärver kanban listans undantag också?** Listan lämnar den lodräta studsen kvar (`-x`, inte
  `none`) eftersom den är det en lång lista läses med. Gäller samma sak en kolumn?
- **Indikatorerna: mäta eller lämna?** Ingen enhetsrapport finns. Om Linear-formen tas
  försvinner frågan av sig själv.

## Utfall

**Tom, och det var syftet.** Pucken fanns för att lägga listans tre motmedel på kanbanporten
också. Blockeraren valde den andra vägen — `varje-kolumn-skrollar-for-sig` — och då fanns
ingenting kvar att bygga. Mätt på 390×700 efter steg 2:

```
kanban   .work    skrollar ingenting
         #port    x
         kolumn   y                 ← varje låda enaxlig
lista    .work    x + y             ← pan-y pinch-zoom, overscroll-x: none, gömda indikatorer
```

Inga `touch-action`, ingen `overscroll-behavior`, inga gömda indikatorer i kanban — och inga
behövs, eftersom webbläsaren låser axeln själv när det finns en box per axel att välja
mellan. Det var så det såg ut innan brädan fick en port; skillnaden är att axlarna nu ligger
på *rätt* två lådor i stället för på `.work` och `#board`.

**`armAxisLock` är fortfarande inert i kanban, och det är nu korrekt i stället för
halvsant.** `.work` skrollar ingen axel där (mätt: `x:false, y:false`), så det finns
ingenting att låsa. Meningen i `CLAUDE.md` — *"`armAxisLock` still takes `.work`, and that is
not an oversight"* — är sann igen, och av ett starkare skäl än när den skrevs: låset är
listans för att kanban inte har något behov av det, inte bara för att `.work` råkar vara
listans port.

**Svaren på de tre öppna frågorna:**

- **Vad räknas som en lyckad mätning av driften?** Frågan besvarades i steg 2 i stället, och
  42°-vinkeln togs med dit: `port.left 0` mot en tvåaxlig ports `299`. Den kontrollen bor i
  `chrome.test.mjs`, med anteckningen om *vad* som håller den — kolumnen är en scrollruta,
  inte portens `overflow-y: hidden`.
- **Ärver kanban listans undantag?** Ingen fråga längre. Listan behåller den lodräta studsen
  (`-x`, inte `none`) för att en lång lista läses med den; en kolumn har bara den axeln, så
  dess studs är den som ska finnas.
- **Indikatorerna: mäta eller lämna?** Upplöst. Regeln skrevs för att en **tvåaxlig** port
  ritar två indikatorer illa. Varje låda ritar en nu, på sin egen axel, vilket är det normala
  fallet. Ingen enhetsrapport behövs för en fråga vars orsak är borta.

**Leveransen är en vakt, inte en fix.** Målets invariant — *ingen låda på brädan skrollar åt
två håll* — hade ingen kontroll, och en regel som bara gäller tills någon råkar lägga
tillbaka en axel är ingen regel. Den mäter bägge halvorna: att kanbans tre lådor tar noll,
en respektive en axel, och att listan behåller sina motmedel. Sabotage fäller dem var för
sig — porten tillbaka till tvåaxlig ger `["x","y"]`, och att ta listans `touch-action` fäller
den andra halvan.

**263 kontroller i `chrome`, 0 fel.**
