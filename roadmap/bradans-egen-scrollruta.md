---
title: Brädan är sin egen scrollruta igen
status: done
tags: [ui]
updated: 2026-09-11
created: 2026-09-08
priority: medium
owner: tor2dbear
---

## Goal

I kanban-läget ska `#board` vara den ruta som skrollar lodrätt, som `.col-head` redan
säger att den är. Då fastnar kolumnrubrikerna igen och den vågräta skrollisten hamnar
längst ner i *fönstret* i stället för längst ner i innehållet.

## Research

**Rubriken fastnar inte, och har inte gjort det sedan skalet fick en fast höjd.**
`.col-head` är `position: sticky; top: 0` och kommentaren bredvid säger att den håller sig
mot brädan, "since `overflow-x: auto` forces `overflow-y: auto` too". Men brädan har ingen
höjd att skrolla inom: `.work` har `align-items: start`, så `#board` blir så hög som sitt
innehåll, och en sticky-box i en behållare som inte skrollar aktiveras aldrig.

Mätt i huvudet på 1000×500 med 40 pucker i `now`:

```
#board           4700px hög, scrollHeight = clientHeight (skrollar alltså inte)
.work            clientHeight 387, scrollHeight 4765  → .work skrollar
efter scrollTop 600:  rubrikens top = -469, portens top = 113
```

Rubriken åker alltså rakt ut ur rutan. Samma mätning visar den andra halvan: brädan är
1212px bred i en 760px-ruta, så den *har* en vågrät skrollist — men den sitter vid y=4700
och går inte att nå utan att först skrolla till botten.

**Det är inte `grid-auto-rows: max-content` som orsakade det.** Den raden kom med
telefonfyndet där brädan målade över foten, och Codex läste den som att den flyttade
lodrät skrollning *ut ur* `#board`. Den låg redan utanför: före den raden hade `.work`
`grid-template-columns: 1fr; align-items: start` och inget mer, och brädan var
innehållshög då också. Skillnaden är bara att den nu slutar måla över foten.

**Fixen är mätt och liten — men svansen är det inte.** En rad räcker för geometrin:

```css
.work { grid-auto-rows: auto; }              /* max-content bort igen */
.work > .board:not(.as-list) { align-self: stretch; min-height: 0; }
```

Mätt med den, samma fixtur: brädan 322px (portens höjd), foten direkt under vid 435,
`.work` skrollar inte alls, `#board` skrollar själv, och rubrikens `top` står kvar på 131
genom hela skrollningen. Listan är oförändrad — `.board.as-list` är ingen scrollruta, så
den fortsätter vara innehållshög med `.work` som port, och gruppradernas lodräta
stickiness rörs inte.

Det som gör den här större än sin diff är att tre ställen till antar att `.work` är *den*
porten:

- `armChromeWheel` skriver `port.scrollTop` — i kanban skulle hjulet över topbaren inte
  flytta någonting alls, vilket är precis den döda zon regeln finns för att stänga.
- `lockScroll` döljer `.work`s overflow. Med brädan som egen ruta skulle den kunna skrolla
  bakom ett öppet ark.
- `openDetail`/`closeDetail` sparar och lägger tillbaka `.work`s position. I kanban ligger
  platsen i `#board` då.

Alla tre är samma fråga en gång var — "vilken box skrollar egentligen" — och den frågan
ska ställas på ett ställe, inte tre. Det är arbetet, inte de två CSS-raderna.

## Open questions

- **Vem svarar på "vilken box är porten"?** En funktion som ger tillbaka `#board` i
  kanban och `.work` annars, som de fyra ställena frågar — eller en `scrollPort()` som
  `armAxisLock` också går genom?
- **Foten hamnar längst ner i fönstret i kanban.** Med brädan sträckt står foten kvar
  underst i stället för att komma efter korten. Det är rimligt, men det är en synlig
  förändring och värd en skärmdump innan den byggs.
- **Ska rubriken över huvud taget fastna i kanban?** Kolumnen är kort på en telefon och
  rubriken är en rad. Det kan visa sig att den vågräta skrollisten är hela vinsten.

## Utfall

`scrollPort()` finns, och att den finns är hela ändringen. De två CSS-raderna stod kvar
som de var mätta; svansen blev ungefär vad pucken förutsåg, med två tillägg den inte hade.

**Frågan hade fyra läsare, inte tre.** Hjulet, låset och puckssidans sparade plats stod i
pucken. Den fjärde var **tabbstoppet**: `.work` bär `tabindex="0"` i markupen sedan regeln
*"porten är ett tabbstopp, eftersom sidan slutade vara det"* skrevs, och en bräda som
skrollar medan `.work` håller stoppet ger Page Down ingenting att flytta igen. `markPort()`
flyttar stopp, namn och — bara på `.work` — `role="region"`; `role` hålls borta från
`#board`, som är en `<main>` och redan ett landmärke. Den ritas om från `renderBoard`,
eftersom layouten byts utan att någon puck öppnas.

**Och en läcka pucken inte kände till.** En sticky-box fäster mot portens *innehållsbox*,
så brädans egna `padding-top: 18px` blev ett band som tillhörde varken rubriken eller
korten: korten gled upp genom det och en remsa av kortet bakom stod ovanför den pinnade
rubriken. Mätt på 390px — `elementFromPoint` i bandet svarade `card` med rubriken 18px
under portens kant. Det är listans läcka (två frysta celler med en gridspringa emellan) en
layout bort, och samma reparation: luften flyttar till lådan som färdas, `.column`.

**Svaret på de tre öppna frågorna:**

- **Vem svarar?** `scrollPort()`, med tre svar och inte två: brädan i kanban, `.work` i
  listan, `.work` på en puckssida. Det tredje är inte en detalj — `#board` är `display:
  none` där men behåller sin layoutklass, så utan det hade en puck öppnad från brädan fått
  en gömd låda utan scrollområde. `armAxisLock` frågar fortfarande inte: låset är listans,
  och där *är* `.work` porten.
- **Foten.** Ja, den står underst i fönstret i kanban. Mätt på en 390px-telefon: 114px av
  844, permanent. Orsaken är att foten ligger *inuti* `.work` som en tredje rad, så när
  brädan slutar vara innehållshög får foten sin höjd och brädan resten. Skärmdump tagen
  före commit, som pucken bad om.
- **Ska rubriken fastna på en telefon?** Ja. Den är en rad, inte ett block — till skillnad
  från listans frysta namnkolumn, som mättes till 368px och retirerade av just det skälet.

**Sabotaget fällde fyra av fem regler — och det femte är fyndet.** Att låta `closeDetail`
fråga efter porten *före* klassen tas bort fällde ingenting, och skälet är att kontrollen
inte mätte mekanismen: i kanban är `#board` själv porten, och Chromium lägger tillbaka en
gömd scrollcontainers offset när den visas igen. Mätt utan någon kod inblandad: 180 → gömd
0 → åter 180. Sparandet är alltså bälte och hängslen här, medan det i listan är bärande
(`.work` klampas på riktigt, och den kontrollen fanns redan). Koden står kvar ändå — den är
*rätt* låda att skriva i, och alternativet är en rad som skriver brädans plats in i `.work`
och råkar vara osynlig så länge webbläsaren gör oss tjänsten. Kontrollen är omskriven till
det den faktiskt visar, plus en andra halva som är vår: går man ur pucken via sidomenyn ska
platsen *släppas*, i bägge lådorna, och det fälls av sabotage.

**Två befintliga kontroller flyttade med regeln i stället för att lappas**, bägge
premissrader vars premiss ändringen avskaffar: *"tavlan sträcker sig utanför rutan"* är
vänd (tavlan är nu **kortare** än `.work`, 176 mot 240, eftersom foten delar rutnätet — den
klipper fortfarande, bara åt andra hållet), och *"brädan är högre än fönstret"* går inte att
arrangera alls längre. Den andra är en starkare ordning än kontrollen bad om: en bräda som
inte *kan* bli högre än sin rad kan inte måla över foten.

## Kvar

Listan gömmer sina inbyggda scrollindikatorer under `(pointer: coarse)`, eftersom en port
med två axlar ritar dem illa — den lodräta stapeln målar under de klibbiga rubrikerna, och
en snärt nedåt blinkar till den vågräta. Kanban-brädan är en tvåaxlig port nu också, så
samma sak kan gälla den. Den regeln skrevs från en rapport från en riktig enhet; den här
har ingen, och att bredda den på symmetri vore precis den omätta svepning arkivmärkets vakt
togs bort för.
