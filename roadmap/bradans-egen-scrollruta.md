---
title: Brädan är sin egen scrollruta igen
status: inbox
tags: [ui]
updated: 2026-09-08
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
