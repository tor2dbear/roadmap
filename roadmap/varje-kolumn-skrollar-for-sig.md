---
title: Varje kolumn skrollar för sig
status: done
tags: [ui]
updated: 2026-09-13
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
- **Platsen blir N tal** — **ja, och det svaret var fel när det skrevs.** Första mätningen
  visade att `closeDetail` inte renderar om, så kolumnernas offsets stod kvar av sig själva,
  och slutsatsen blev "koden behövde ingen ändring". Den höll bara för den ena vägen in och
  ut. Granskningen hittade tre till, och platsen är sedan dess verkligen N tal med ett eget
  minne:
  - **En omritning i en synlig bräda** (`loadWritableRepos` som landar) byter ut noderna.
    `colPlaces` läses ut per kolumnnyckel före rensningen och läggs tillbaka i ett svep över
    en *färdig* bräda — en återställning inne i loopen tvingar fram en layout av en halvbyggd
    bräda och klampar portens `scrollLeft` till 0 (mätt: 90 → 0).
  - **En omritning bakom en öppen puck** kan inte ta emot något alls: en dold scrollruta
    rapporterar `scrollTop` som 0 och kan inte skrivas till. `openDetail` tar därför en
    ögonblicksbild i `boardAt.cols` *medan brädan syns*, och `closeDetail` lägger tillbaka
    den.
  - **En navigering** ska inte ärva platsen. Brädan stämplas med vy + filter + gruppering,
    och platsen läggs bara tillbaka när stämpeln är densamma — `NO_VALUE` är fyra
    grupperingars nyckel, och `status` är samma gruppering i All som i Ready.

  Lärdomen är inte att svaret var fel utan **varför**: det drogs ur en enda mätt väg och
  formulerades som om det gällde alla. "Koden behövde ingen ändring" är en slutsats som
  kräver att man letat efter vägarna, inte att den man råkade mäta höll.
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

## Sedan dess

Fem fel till, funna efter att pucken stängts — två rapporterade av användaren, tre av en
granskningsomgång. De hör hemma här och inte i en egen puck: vart och ett är en följd av
att `.cards` blev en scrollruta, och det är den här puckens ändring.

**Regeln pucken skrevs av är alltså tillämpad på sig själv** — *"när ett senare steg rör kod
en stängd puck beskriver, läs om dess utfall innan PR:en går vidare"* — och det här är den
läsningen. Inget ovanför är osant; det som stod där gällde koden som den var när det skrevs.

- **Släpplinjen ritades under kolumnens `+`.** `.col-add` flyttade in i skrollrutan i det
  här arbetet, och `showDropLine` la linjen *sist i behållaren* för "efter alla korten".
  Mätt med tre kort: linjen på y=487 mot ett sista kort som slutar på 433, med knappens
  443–474 emellan — 54px under det släppet faktiskt skriver. `dropPointAt` läser `.card` och
  svarar `null` för slutet; den meningen måste nu sägas två gånger, eftersom behållaren
  håller mer än kort.
- **Kortets skugga kapades rakt av till vänster.** En scrollruta klipper vid sin paddingruta,
  och `.cards` hade ingen vänsterpadding: mätt, scrollruta och kort bägge på 262. `0 2px 8px`
  föll alltså mjukt ut i körfältet till höger och tvärt av till vänster — ett kort, två olika
  kanter. Fyra pixlar (suddets halva räckvidd) blöds och skjuts in precis som körfältet, så
  kortlådan står stilla och register med `.col-head` hålls.
- **Hjulet över kolumnrubriken tog hela gesten.** `preventDefault` avbryter ett hjulevent
  *helt*, så att avbryta för att ta lodrätt kastade sidled med sig: mätt, en diagonal
  (120, 12) över en rubrik gav kolumnen 12 och porten **0**, medan samma gest över en rubrik
  vars kolumn inget hade att skrolla gav porten 120. Lyssnaren är passiv nu och skriver bara
  `scrollTop`; webbläsaren tar sidled själv. Ingenting dubbelskrollar, och det är mätt och
  inte antaget: porten är `overflow-y: hidden` och sidan under skrollar inte alls, så det
  oavbrutna `deltaY` når ingen scrollruta någonstans.
- **Fokusringen namngav fel låda.** `.work:focus:not(:focus-visible)` skrevs när `.work` var
  scrollrutan. I kanban är den inte det — `markPort` flyttar stoppet till `.port` och varje
  rullande kolumn är ett eget — så ett musklick bredvid korten drog en ring runt lådan man
  just pekat på. Alla tre namnges nu.
- **Facket hade inte bara en streckad ram, det hade ramens inskjut.** Begärt borttaget, och
  borttagandet var samtidigt resten av fellinjeringen användaren rapporterade en tredje
  gång: 1px ram plus 10px sidpadding la fackets titel 11px från dess egen vänsterkant där en
  kolumns står på 18, och dess rader 11px in där korten bredvid börjar på 0. Kvar är
  `align-self: start`; `.column` säger resten, vilket är poängen — facket *är* en kolumn.
  18:an är svatchen plus rubrikens gap, så facket behåller svatchens **plats** utan märket:
  fyra kolumner har ingen gemensam färg, och en padding vore samma två tal nedskrivna en
  gång till, på det enda ställe ingenting håller dem i takt.

**Och listen blev diskret, i bägge teman med en regel.** Sidomenyn har svarat på det sedan
den skrevs — tunn tumme i `--line`, inget spår, `--ink-3` under pekaren — och bägge teman är
redan besvarade eftersom tokenen är det. Avsiktligt *inga* `::-webkit-scrollbar`-regler,
till skillnad från sidomenyn: en bredd där gör en overlay-list klassisk, och en klassisk
list tar sin bredd ur `clientWidth`. Det hade krympt korten med 8px och gått ur register med
`.col-head` — precis det körfältet finns för. Mätt: `clientWidth` 288 före och efter,
kortets högerkant 302 mot rubrikens 302, bägge vägarna.

**Och sabotaget fällde två av de sju kontrollerna som skrevs för det här — bägge mina.**
Det är hela skälet till att sabotera innan man litar:

- **Släpplinjens kontroll gjorde om vad `showDropLine` gör** i stället för att anropa den —
  samma två rader, i testets `evaluate`. Den mätte alltså sin egen kopia, och att sätta
  tillbaka `appendChild` fällde ingenting alls. Den driver en riktig dragning nu: ett
  `dragstart` på ett kort sätter `dragItem`, ett `dragover` under sista kortet ger
  `before == null`, och det är appens funktion som ritar. Sabotaget fäller fyra rader.
- **Fokusringens kontroll gick inte att fälla alls, och det var webbläsarens förtjänst.**
  Chromiums egen stilmall ringar bara på `:focus-visible`, så ett musfokus är ringlöst av
  sig självt här — regeln är defence-in-depth för webbläsare som ringar på rena `:focus`.
  Det som *går* att mäta, och som var felet, är **täckningen**: regelns selektor läses ur
  stilmallen, pseudoklasserna skalas av (`matches` mot `:focus` svarar nej om lådan inte
  står i fokus just då, och frågan är vilka lådor regeln gäller), och varje tabbstopp i
  kanban ska namnges av den. Smalna regeln till `.work` igen och den faller. Beteendet står
  kvar som kontroll och står nu utskrivet som det defence-in-depth det är — annars hade
  täckningen sett ut som ett beteendebevis.

**357 kontroller i `chrome`, 0 fel**, och vart och ett av de sju sabotagen fäller sin egen
rad: ramen tillbaka, svatchens plats borta, ingen diskret list, inget körfält åt skuggan,
linjen sist i behållaren, hjulet som avbryter hela gesten, och regeln som bara namnger
`.work`.

**Ett sjätte fynd, i samma omgång och med samma orsak som de tre platsbuggarna:
tabbstoppet.** Regeln är *en dold scrollruta går varken att mäta eller skriva till*, och
den har nu visat sig från tre håll. Platsen hade bägge sina lagningar — ögonblicksbilden i
`openDetail` på väg in, återställningen i `closeDetail` på väg ut. Stoppet hade ingen: passet
sist i `renderColumns` mäter ett `display: none`-träd där varje låda svarar 0, så en omritning
bakom en öppen puck (`loadWritableRepos` som landar, en redigering) kör passet och beslutar
att *ingen* kolumn är ett stopp. Mätt: `tabindex="0"` före, borta bakom pucken, och **kvar
borta** när pucken stängts och kolumnen rullade igen. I Safari slutar den kolumnen vara
nåbar från tangentbordet, vilket är just den asymmetri stoppet finns för. Codex fann det (#54).

`markColumnStops()` är den enda skrivaren, och `closeDetail` frågar om — **utanför**
ögonblicksbildens grind, eftersom omritningen tar stoppen oavsett om en plats sparades och
oavsett om grupperingen fortfarande stämmer. Den *räknar om* i stället för att återställa: en
kolumn som slutade svämma över medan pucken var öppen ska inte få tillbaka ett stopp.

Och kommentaren bredvid passet sa motsatsen — *"passet kör ändå, för det avgör också
tabbstoppen"* — vilket är sant om anropet och falskt om svaret. Det är samma sorts mening som
den här pucken redan rättats för en gång: en som var sann när den skrevs och som ingen läste
om när lådan under den ändrades.

**Ett sjunde, och det är den sista lådan som inte hade fått formens regler: facket.** Det är
den enda lådan på brädan som skrollar utan att vara ett *grupperingsvärde* — det håller rader,
inte kort — och varje ögonblicksbild frågar `.cards[data-col]`. `renderHiddenTray` satte ingen
nyckel, så alla fyra gick rakt förbi den. Mätt med elva arkivgömda repon i ett 300px-fönster:
469 mot 128, alltså en riktig scrollruta, vars enda innehåll är de ögon man skrollade dit för.
En omritning kastade läsaren till toppen av just den listan. Codex fann det (#54).

`TRAY_KEY` är `NO_VALUE`s trick en rad över: en NUL-prefixad sträng ingen skörd kan producera,
alltså kollisionsfri mot ett repo, en status, en agent eller en tagg.

**Men den blir inget tabbstopp, och skälet är raderna och inte nyckeln.** En kolumns kort är
`div`ar med en klicklyssnare och inget fokuserbart i sig, så scrollrutan är den *enda*
tangentbordsvägen till det som ligger där nere. Fackets rader är `<button>`, så Tab når varje
öga och webbläsaren skrollar fram det. Chrome drar samma gräns själv — mätt i tabbordningen:
kolumnens `.cards` ligger i den, fackets gör det inte. Att märka facket vore alltså ett *nytt*
stopp, inte den Safari-paritet `markColumnStops` finns för. Två frågor, två urval.

**Och den befintliga sviten fällde min egen ändring innan jag hann köra sabotaget**, vilket är
det bästa som kan hända: kontrollen *"bara en kolumn som kan skrolla är ett tabbstopp"* valde
sina lådor med `[data-col]` och krävde `role="region"` av var och en. I samma stund facket fick
en nyckel föll den. Premissen som bar — *facket har ingen nyckel* — höll inte längre, så urvalet
står på klassen nu, samma rad som `markColumnStops` frågar med.

**En andra egen miss, fångad av samma körning:** jag skrev att en kolumns `.cards` har noll
fokuserbara barn. Det gäller utan token — med token ligger `.col-add` inne i skrollrutan. Rätt
mätning är *innehållet*: inget `.card` är fokuserbart, varje `.hidden-col` är det.

**Ett åttonde, och det är platsens fråga ställd om tangentbordet.** Att lägga tillbaka
*offseten* är bara halva saken: `renderBoard` byter ut noden, så fokus faller till dokumentet
och Page Down flyttar därefter ingenting alls. Mätt: fokus på `.cards[data-col=now]`, platsen
kvar på 120 — och Page Down gav **120 → 120**. Det är en regression härifrån; medan `.work`
var enda porten var den ett stabilt mål ingen omritning rörde. Codex fann det (#54).

`colFocus` fångas före rensningen och läggs tillbaka efter att stoppen satts — ordningen bär,
för en kolumn måste *vara* ett stopp innan den kan fokuseras. Tre villkor, och vart och ett
har en anledning:

- **Samma bräda** (`samma`), samma stämpel som offseten redan grindas på.
- **Aldrig bakom en öppen puck** — fokus hör till puckssidan där, och `display: none` hade
  ändå gjort anropet till en tyst nolla.
- **Bara om fokus låg *inne i* brädan.** En omritning medan läsaren står i sidomenyn, ett
  fält eller en yta får inte dra fokus till en kolumn. Sabotaget som tar bort den vakten
  fäller sin egen rad.

`preventScroll`, eftersom fokus på en låda skrollar fram den — vilket hade rivit upp portens
`scrollLeft` som återställs tre rader ovanför. Och nyckeln söks genom att *scanna* och inte
med en attributselektor: en nyckel är ett grupperingsvärde — ett reponamn med snedstreck,
`NO_VALUE`s NUL, `TRAY_KEY` — och inget av det hör hemma i en selektor.

Samma idiom brädan redan använder två gånger: `segmented()` lägger tillbaka det tryckta
segmentet efter en ombyggnad, och `toggleGroup` hittar sin kontroll igen på `data-fold`.

**Ett nionde, och det sista av formens lådor som fick svara på fel fråga.** `closeDetail`
frågade `scrollPort()` om var platsen skulle tillbaka, men layouten kan ändras *medan pucken
är öppen*: ⌘K erbjuder fortfarande `Layout: list/board`, och `setDisplay` stänger ingen puck.
`scrollPort()` svarar då med en annan låda på vägen ut än på vägen in, och kanbanportens
`scrollLeft` skrevs rakt in i listans `.work`. Mätt vid 700px: porten läst på 200, layouten
bytt bakom pucken, och efter stängning stod `.work` på **178** — hela dess sidledsrum, alltså
en lista öppnad helt förskjuten. Codex fann det (#54).

`boardAt` minns **lådan**, inte bara talen, och platsen läggs tillbaka bara när `scrollPort()`
svarar med samma nod. Det är samma form och samma bot som `lockedEl` i `lockScroll`, som den
här filen redan valt en gång för exakt samma problem: *två funktioner som måste vara överens
om ett rörligt svar är formen den här filen städar bort*. Identitet är dessutom ett exakt svar
där layoutklassen bara vore ett ombud för det — och `.work` och `#port` överlever varje
omritning, eftersom `renderBoard` byter ut brädans barn och inte dess förfäder.

**Och en av mina egna kontroller visade sig flaka, 1 gång på 5.** Den väntade på ett draggbart
kort som tecken på att omritningen skett — ett **ombud** för det den mäter, inte det den mäter.
Ett ombud svarar när något *annat* råkar bli sant. Den markerar noderna före och väntar på att
de är utbytta nu, och läser dolt-läget och stoppen i samma `evaluate`, så att en synlig bräda
fäller den rad som namnger orsaken i stället för den som mäter symptomet. Fyra rena körningar
efter. Det är samma lärdom som `bradans-egen-scrollruta` fick om portens `overflow-y`: mät
mekanismen, inte något som brukar följa med den.

**Och ett tionde, direkt efter det nionde och inte samma sak.** Identitetsvakten löste ett
byte av *låda*; ett **grupperingsbyte** behåller samma `.port`, så den vakten sa ja till en
bräda som inte finns längre. Mätt vid 700px: `all␀␀status` skrollad till 200, bytt till
`all␀␀repo` från ⌘K bakom pucken, och efter stängning öppnade en trekolumnersbräda 200px in
med 202 av rum — Alpha och Beta utanför skärmen. Codex fann bägge halvorna, en efter en, och
**ingen av dem följer av den andra**: ett layoutbyte behåller stämpeln, ett grupperingsbyte
behåller lådan.

**Men lagningen var inte att låta bli att återställa, och det tog en mätning att se.** Att
dölja brädan tömmer porten, vilket klampar den till 0 — och *Chromium ger tillbaka offseten
av sig själv när innehållet kommer åter*. Det är exakt beteendet `openDetail`s egen kommentar
noterar (*"Chromium remembers it and gives it back when the box is shown, but only for a box
that survives"*), här arbetande emot oss. Mätt med vår återställning **helt borttagen**: porten
kom ändå tillbaka på 200. Vakterna avgör alltså om platsen är *vår* att lägga tillbaka; är den
inte det är webbläsarens kopia det som står kvar, och bara en nollställning tar bort den.

**En rad skrevs och togs bort igen, och skälet hör hit.** Jag nollade först även den *andra*
lådan — kanbanporten som lämnas bakom när layouten byts. Inget kunde fälla den: går man
tillbaka till kanban står porten på 200 oavsett, eftersom webbläsarens minne överlever en
skrivning gjord medan lådan inte hade något rum att hålla den i. Och det är dessutom *rätt*
att den gör det — det är samma bräda, och läsaren skrollade den dit. En deklaration som inte
kan gälla är inte en vakt, den är ett påstående.

Tre delar, tre sabotage, och de fäller olika rader: utan stämpelvakten faller
grupperingskontrollen, utan identitetsvakten faller layoutkontrollen, och utan nollställningen
faller grupperingskontrollen igen. En fjärde kontroll är motprovet — en **oförändrad** bräda
ska få sin plats tillbaka, annars vore de två vakterna en avstängning och inte vakter.
