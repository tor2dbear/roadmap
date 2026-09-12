---
title: Listans motmedel följde inte med till kanban
status: inbox
tags: [ui]
updated: 2026-09-12
created: 2026-09-12
priority: medium
owner: tor2dbear
depends: [varje-kolumn-skrollar-for-sig]
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
