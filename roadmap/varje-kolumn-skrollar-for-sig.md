---
title: Varje kolumn skrollar för sig
status: done
tags: [ui]
updated: 2026-09-12
created: 2026-09-12
priority: medium
owner: tor2dbear
parent: skroll-isoleras-till-en-axel
depends: [foten-flyttar-in-i-sidomenyn]
---

## Goal

I kanban ska **varje kolumn vara sin egen lodräta scrollruta** och ytterlådan bara skrolla
i sidled — Linears form, rapporterad därifrån med skärmdump. Rubriken pinnas då inte: den
ligger *utanför* lådan som skrollar, vilket är ett annat svar än `.col-head { position:
sticky }` och ett billigare.

Det är efterföljaren till `bradans-egen-scrollruta`, som gav brädan en port. Den här frågar
vad porten ska vara *till för*.

## Research

Prototypad mot repots egen datasnapshot (117 pucker, fyra banor) och mätt i två format.
Fem deklarationer räcker, och DOM:en har redan rätt form — `.column` > `.col-head` +
`.cards`:

```css
.work > .port:has(> .board:not(.as-list))   { overflow-y: hidden; }
.port > .board:not(.as-list)                { flex: 1; min-height: 0; padding-bottom: 0; }
.port > .board:not(.as-list) > .column      { display: flex; flex-direction: column; min-height: 0; }
.port > .board:not(.as-list) > .column > .cards    { overflow-y: auto; min-height: 0; flex: 1; }
.port > .board:not(.as-list) > .column > .col-head { position: static; }
```

`flex: 1; min-height: 0` på brädan är den rad som inte är uppenbar: utan den står brädan på
sin innehållshöjd (1833px i en 731px port), kolumnerna får ingen bestämd höjd och `.cards`
har inget att skrolla inom. Mätt i första försöket — porten skrollade fortfarande lodrätt
och ingenting hade ändrats.

**Mätt, 390×844:**

```
                         före                efter
porten skrollar          x + y               x
brädans höjd             1873                618  (portens höjd minus foten)
kolumnrubrik vid scroll  pinnad mot 0        står kvar på 18
Later (15 kort)          följer brädan       egen ruta, plats 300 medan grannarna står
foten                    y=1986, skrollar    y=731, permanent
```

**Tre buggar försvinner för att deras orsak försvinner:**

- **Skugg-kanten** (`margin-inline: -8px` på `.col-head`) finns bara för att rubriken målas
  *över* ett bortskrollat kort och måste täcka dess `0 2px 8px`. Ingen överlappning, ingen
  skugga att täcka.
- **18px-bandet som tillhörde ingen.** En sticky-box fäster mot portens innehållsbox; utan
  sticky finns frågan inte.
- **`Now försvinner upp`** — en kort kolumn som tog sin rubrik med sig ut ur rutan. Med
  varje kolumn i radens höjd är det strukturellt omöjligt, och `align-items: stretch` blir
  en konsekvens i stället för en lagning.

**Och facket, som var en egen rapport.** *"Hidden hamnar lite off"* — facket är en `.column`
med `align-self: start` och `position: static` rubrik, så det glider upp ur rutan när man
skrollar. Mätt före: `huvudY -289` vid scroll 300. Efter: `11`, oförändrat. Det behöver inte
pinnas, för det finns ingen lodrät resa att glida i.

**Priset är foten, och det är ett beslut som redan fattats en gång.** Med ytterlådan
enaxlig finns ingen lodrät resa utanför en kolumn, så foten har ingenstans att skrolla bort
till. Mätt: **114px permanent på 390×844** (13% av fönstret), 65px på 1400×900. Det är exakt
det som rapporterades som fel i `bradans-egen-scrollruta` — *"Nu ligger footern sticky i
botten. Det vill jag inte"* — den gången 114 av 844. Linear har ingen fot; vi har
skördetiden, `sync now` och tre länkar.

En tunn fot provades i prototypen (`flex-wrap: nowrap`, länkarna dolda) och mätte 62px, men
den radbryts fortfarande och lämnar lösa `·` efter sig. En enradig fot är eget arbete i
markupen, inte en CSS-rad.

## Open questions

- ~~**Vad händer med foten?**~~ **Avgjord:** den tas bort och innehållet flyttar in i
  sidomenyn — `foten-flyttar-in-i-sidomenyn`, som den här nu är blockerad av. Priset är
  alltså redan betalt när den här startas: de 114px finns inte att förhandla om, och
  brädan behöver ingen lodrät resa att skrolla bort en fot i.
- **Platsen blir N tal i stället för ett.** `openDetail` sparar en offset och `closeDetail`
  lägger tillbaka den; med sju kolumner som var och en minns sitt läge, och `renderBoard`
  som byter ut brädan, är det sju. `scrollPort()` svarar med *en* låda — vad svarar den här?
- **Hjulet över krommet tappar sin lodräta halva.** Regeln *"krommet ovanför porten är ingen
  död zon"* forwardar `deltaY` till porten. Pekaren står över topbaren, inte över en kolumn,
  så det finns ingen kolumn att skicka den till.
- **Dra kort mellan kolumner** ska autoskrolla två nästlade lådor i stället för en. Bara en
  desktopfråga — HTML5-dnd finns inte på iOS touch alls.
- **Scrollindikatorerna**, som `bradans-egen-scrollruta` lämnade öppna: varje låda blir
  enaxlig här, så den frågan kan lösas upp av sig själv i stället för att besvaras.

## Utfall

Byggd som prototypen mätte, med en rad till som inte syntes förrän den fattades, och med en
konsekvens ingen av frågorna hade förutsett.

**Regressionen togs bort av formen, inte av ett lås.** Codex hittade den på grenen (#54)
medan den här pucken låg oskriven: porten var tvåaxlig och en diagonal svep drev åt sidan.
Samma 42°-gest genom CDP, tre lägen:

```
main (innan brädan fick en port)   .work y, #board x   →  board.left 299, work.top 0
grenen med tvåaxlig port           #port  x + y        →  port.left 299, port.top 337
nu                                 port x, kolumn y    →  port.left   0, kolumn 331
```

Axlarna låg på två lådor från början. Porten slog ihop dem, och då fanns ingen box kvar för
webbläsaren att välja mellan. Scroll per kolumn lägger tillbaka dem, en nivå in.

**Och det bästa sabotaget fällde ingenting.** Att sätta tillbaka `overflow: auto` på porten
lämnar driftkontrollen grön: gesten träffar den innersta scrollrutan, och det är kolumnen.
Det som bär är att kolumnen *är* en scrollruta — tas `overflow-y` bort från `.cards` kommer
driften tillbaka omedelbart (`portX: 514`), med eller utan portens rad. Portens
`overflow-y: hidden` är alltså en avsiktsförklaring och inte mekanismen, precis som hjulets
containment-guard. Det står nu i bägge filerna.

**Svaren på de fyra öppna frågorna:**

- **Foten** — avgjord i förväg och byggd som eget steg. Priset var betalt när det här
  startade.
- **Platsen blir N tal** — nej. `closeDetail` renderar inte om, så kolumnernas egna offsets
  står kvar av sig själva; `exitPuckView` gör det och nollar dem, vilket är exakt det den
  ska. Koden behövde ingen ändring, kontrollerna behövde mäta kolumnen i stället för porten.
- **Hjulet över krommet** — den lodräta halvan är borta, och det är det ärliga utfallet:
  det finns ingen skroll på brädnivå att forwarda till, och pekaren över topbaren står
  ovanför ingen kolumn. Att välja en åt användaren vore att hitta på en destination.
  Regeln är listans nu.
- **Dra kort mellan kolumner** — orörd. HTML5-dnd autoskrollar inte åt oss i någotdera
  läget, så frågan var teoretisk.

**En femte läsare som ingen fråga hade ställt: låset.** `lockScroll` dolde portens overflow,
och den lodräta skrollen bor inte där längre — mätt med ett hjul bakom ett öppet ark: kolumnen
gick 0 → 300. Fixen är en CSS-klass och inte en lista av element, för arket som låser
(Display) är också det som ritar om brädan: ihågkomna `.cards`-noder vore frånkopplade precis
när de behövdes. Två `:not(.x)` bär specificiteten förbi kolumnregeln — utan dem beräknades
`overflow-y: auto` och regeln gjorde ingenting, medan scrimen fick det att se ut som att den
fungerade. **Sabotage kan inte fälla den**: scrimen äter hjulet oavsett. Kontrollen mäter
därför den beräknade stilen, och att scrimen är det läsaren märker står nedskrivet.

**Tabbstoppet fick följa med.** Varje kolumns kortlista är en egen `role="region"` med
kolumnens namn, eftersom porten bara skrollar i sidled och Page Down annars inte flyttar
något.

**Sju kontroller flyttade med premisserna i ett svep** — rubriken pinnas, brädan svämmar ur
porten i höjdled, porten tar hjulets `deltaY`, platsen är portens `scrollTop`, låset lägger
tillbaka den, en popover läser brädans underkant, och spillet att måla med är portens. Alla
sanna om en tvåaxlig port, alla meningslösa utan en.

**En sjätte läsare, funnen i granskning efter att pucken stängts.** `renderBoard` gör
`board.innerHTML = ""`, och kommentaren ovanför den raden lovar att en asynkron omritning
inte kastar tillbaka läsaren — *"inget mäter brädan medan den är tom"*. Löftet höll för en
låda som **överlever** rensningen, och kolumnerna gör inte det: `.cards` är brädans lodräta
port nu och tas med. Fallet är det kommentaren själv namnger: `loadWritableRepos` som landar
på en inloggad bräda ritar om identiskt innehåll, och en läsare halvvägs ner i en kolumn
hamnade överst. Platsen läses ut per kolumnnyckel före rensningen och läggs tillbaka efter.

**Och lagningen hade två egna fel, bägge fångade av dess egen kontroll innan de gick vidare.**

1. *Återställ i loopen* — att skriva `scrollTop` kräver scrollvidden, alltså framtvingas en
   layout, av en bräda med två kolumner av fyra. Porten är bredare än så, så dess
   `scrollLeft` klampade till 0 (mätt: 90 → 0). Det är regeln överst i `renderBoard` i ny
   förklädnad — *inget får mäta brädan innan den är hel* — och samma reparation: vänta tills
   den är det. En enda svepning över en färdig bräda.
2. *Platsen ärvs vid navigering* — `exitPuckView` nollar porten och `.work` för att en annan
   tavla inte ska öppnas där en längre lista lästes. Med nycklar som är grupperingens egna
   värden är `now` fortfarande `now` i nästa vy, så den gamla brädans plats lades tillbaka
   en låda längre in. `colPlaces` töms där, och kolumnerna nollas.

**Och en sjunde: CSS ger inte kolumnen en axel bara för att man ber om det.** `overflow-y:
auto` bredvid ett `overflow-x` som är `visible` beräknar den synliga till `auto` — samma
regel som tvingar `#board` att inte vara scrollcontainer, läst åt andra hållet. Ett
obrytbart ord i ett kort öppnade alltså andra axeln igen: mätt med en URL i en titel, 414px
sidled jämte 1337 lodrätt. Vakten *"ingen låda skrollar åt två håll"* såg det inte, eftersom
fixturens alla titlar bryts — den mätte en bräda där frågan aldrig ställdes.

Två regler, och vilken som gör vad är värt att veta: `overflow-wrap: anywhere` på titeln är
**fixen** (414 → 0), `overflow-x: clip` på `.cards` är **garantin** för nästa sak som råkar
svämma över. Garantin har tänder — med spillet kvar göms texten i stället för att skrollas
till — så de två hör ihop. `clip` köper inget över `hidden` här och behålls för avsikten:
när den andra axeln skrollar är `clip` specificerat att beräknas till `hidden`, och mätt gör
den det, med `scrollLeft` skrivbar under bägge.

**269 kontroller i `chrome`, 0 fel**, och vart och ett av de fem sabotagen fäller sin egen
rad: ingen återställning alls, återställning i loopen, `exitPuckView` som behåller platserna,
ingen ombrytning, och ingen klippning.
