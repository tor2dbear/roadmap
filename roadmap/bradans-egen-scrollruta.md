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

**Titeln höll inte bokstavligt, och det är värt att säga först.** Brädan blev inte sin egen
scrollruta — en låda *runt* den blev det, och skälet står i första stycket nedan. Rubriken
fastnar, sidledslisten hamnade längst ner i fönstret, och kolumnerna skrollar: allt pucken
bad om, genom en annan låda än den namngav. (Samma sak hände
`nastling-listan-nastlar-tavlan-hinkar`, en syskonpuck: titeln lovade två projektioner och
den andra höll inte.)

`scrollPort()` finns, och att den finns är hela ändringen. De två CSS-raderna stod kvar som
de var mätta; svansen blev ungefär vad pucken förutsåg, med tre tillägg den inte hade.

**Porten blev en egen låda, och foten var skälet.** Det uppenbara är att göra `#board` till
scrollrutan, och så byggdes det först. Men brädan lägger ut sina barn `grid-auto-flow:
column`, så en fot *inuti* den blir bara ännu en kolumn — och en fot *utanför* den låda som
skrollar är en fot som aldrig skrollar bort. Den stod fast underst i fönstret i en commit,
rapporterad från telefonen: 114px av 844. `.port` wrappade därför brädan **och** foten och
skrollade bägge axlarna; brädan gick tillbaka till att svämma över synligt, vilket den måste,
för en sticky-box löser upp mot närmaste scrollcontainer och får inte hitta brädan. Det är
exakt listans arrangemang en layout bort — `.board.as-list` har stängt av sin egen
`overflow-x` sedan listan skrevs, av samma skäl. (Lådan står kvar och skälet är nu det
andra: se *Sedan dess* nedan.)

**Frågan hade fyra läsare, inte tre.** Hjulet, låset och puckssidans sparade plats stod i
pucken. Den fjärde var **tabbstoppet**: `.work` bär `tabindex="0"` i markupen sedan regeln
*"porten är ett tabbstopp, eftersom sidan slutade vara det"* skrevs, och en port som
skrollar medan `.work` håller stoppet ger Page Down ingenting att flytta igen. `markPort()`
flyttar stopp, roll och namn, och ritas om från `renderBoard` eftersom layouten byts utan
att någon puck öppnas. `role="region"` hålls borta från `#board` — det är en `<main>` och
redan ett landmärke.

**Och en läcka pucken inte kände till.** En sticky-box fäster mot portens *innehållsbox*,
så brädans egna `padding-top: 18px` blev ett band som tillhörde varken rubriken eller
korten: korten gled upp genom det och en remsa av kortet bakom stod ovanför den pinnade
rubriken. Mätt på 390px — `elementFromPoint` i bandet svarade `card` med rubriken 18px
under portens kant. Det är listans läcka (två frysta celler med en gridspringa emellan) en
layout bort, och samma reparation: luften flyttar till lådan som färdas, `.column`.

**Svaret på de tre öppna frågorna:**

- **Vem svarar?** `scrollPort()`, med tre svar och inte två: `.port` i kanban, `.work` i
  listan, `.work` på en puckssida. Det tredje är inte en detalj — `#board` är `display:
  none` där men behåller sin layoutklass, så utan det hade en puck öppnad från brädan fått
  en gömd låda utan scrollområde. `armAxisLock` frågar fortfarande inte: låset är listans,
  och där *är* `.work` porten.
- **Foten.** Nej — och det är puckens enda fråga som fick ett annat svar än den väntade sig.
  Den *stod* underst i fönstret så länge brädan var porten, och det var fel: foten hör till
  innehållet. Mätt på 390px efter omstruktureringen: y=10352, alltså sist bland korten.
  Skärmdump tagen och visad före commit, som pucken bad om — det var den som avgjorde.
  (Frågan är sedan dess avskaffad: foten finns inte.)
- **Ska rubriken fastna på en telefon?** Ja, var svaret här. Den är en rad, inte ett block —
  till skillnad från listans frysta namnkolumn, som mättes till 368px och retirerade av just
  det skälet. (Också avskaffad: rubriken pinnas inte längre, den ligger utanför det som
  skrollar.)

**Sabotaget fällde åtta av elva regler, och de tre som stod kvar är fynden.**

1. Att låta `closeDetail` fråga efter porten *före* klassen tas bort fällde ingenting:
   Chromium lägger tillbaka en gömd scrollcontainers offset när den visas igen. Mätt utan
   kod inblandad: 180 → gömd 0 → åter 180. Sparandet är bälte och hängslen i kanban och
   bärande i listan. Koden står kvar — den är *rätt* låda att skriva i — och kontrollen är
   omskriven till det den visar, plus en halva som är vår: går man ur pucken via sidomenyn
   ska platsen släppas, i bägge lådorna, och det fälls av sabotage.
2. `lockedEl` täcks av `relockScroll`: det är överföringen som bär, inte minnet.
3. Hjulets containment-guard skyddar inte mot dubbelskroll — det gör first
   refusal-vandringen.

**Fyra befintliga kontroller flyttade med strukturen i stället för att lappas.** Tre är
premissrader vars premiss ändringen avskaffar (den klippande lådan är porten, spillet ligger
i dess scroll, foten kommer efter brädan i stället för i fönstrets botten). Den fjärde är
listans axellås: `touch-action`, sidledsstudsen och de gömda indikatorerna är scopade
`.work:has(> .board.as-list)` — ett *direkt* barn, medvetet precist — och brädan slutade
vara ett direkt barn när den fick en förälder. Fem kontroller föll på en gång, ingen av dem
om det här bytet.

## Sedan dess

**Tre saker i utfallet ovan var sanna när de skrevs och är det inte längre**, och de ändrades
av arbete i samma PR. Det står här i stället för att retuscheras bort: berättelsen är
protokollet, men ingen mening ska påstå något om *idag* som inte gäller.

| vad utfallet säger | vad som gäller nu | av |
| --- | --- | --- |
| `.port` håller brädan **och** foten | porten håller bara brädan; foten finns inte | `foten-flyttar-in-i-sidomenyn` |
| porten skrollar bägge axlarna | porten skrollar i sidled, kolumnen i höjdled | `varje-kolumn-skrollar-for-sig` |
| rubriken ska fastna, och gör det | rubriken pinnas inte — den ligger utanför det som skrollar | `varje-kolumn-skrollar-for-sig` |

Med dem gick också 18px-läckan (en sticky-box fäster mot portens innehållsbox — ingen sticky,
ingen läcka) och frågan om scrollindikatorerna: den ställdes för att kanbanporten blivit
tvåaxlig, och den är enaxlig igen.

**Och lärdomen, för tredje gången på det här brädet.** `ea58358` rättade `sortering-ar-en-kedja`,
`2b3e61a` rättade den här pucken en gång, och det här är samma fel en tredje: ett utfall är
sant om den commit som skrev det, inte om PR:en det ligger i. Skärpt regel, eftersom den
uppenbarligen behöver det: **ändrar ett senare steg i samma PR kod som en stängd puck
beskriver, ska den puckens utfall läsas om innan PR:en går vidare.** Det är inte en fråga om
minne utan om ordning — kolla de stängda puckerna i grenens diff, inte bara de öppna.
