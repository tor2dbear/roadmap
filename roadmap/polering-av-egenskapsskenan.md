---
title: "Polering av egenskapsskenan"
status: now
tags: [ui]
updated: 2026-08-25
created: 2026-08-22
order: 5
depends: [ui-overlay-och-pickers]
parent: gui-hantverk
---

## Goal
Ta skenan från "strukturerad" till "polerad", och stäng de granskningsfynd som
kom in efter att `ui-overlay-och-pickers` mergats.

## Research
Sektioneringen bär — sidan går att skumma, tre block i stället för tretton
likvärdiga rader. Men chip-regeln sköt över målet: sju identiska konturer i rad
gjorde att en tom puck såg ut som ett **formulär** i stället för som en puck vars
fält råkar vara tomma.

Felet var att två betydelser fick samma kläder. `No priority` och `Unassigned` är
*tillstånd* — fältet har inget värde. `Set target`, `Link issue`, `Add` är
*uppmaningar*. Att rita bägge som knappar gör tillståndet till en uppmaning.

## Delivered
- **Tomma värden är tysta.** Dämpad text i vila, ram vid hover/fokus/tryck.
  Paddingen står kvar — den är träffytan. En delvis reträtt från gårdagens beslut,
  och rätt sådan: pilen behövde ersättas, men inte med sju lådor.
- **Rubrikerna rankar över nycklarna.** Samma mono-röst som nyckelkolumnen gjorde
  att `PEOPLE` läste som ännu en radnyckel. Mer luft ovanför, mindre under, och
  vikt. Och en rubrik över **en enda rad** väger mer än den separerar: utan
  assignee ansluter `Agent` till blocket ovanför i stället.
- **Rollupen sitter i värdet.** `Pucks 0/1` i nyckelcellen lästes som en längre
  etikett; nu samma `rollup`-bricka som korten använder, i värdet.
- **Relationslänkarna hade tappat sin färg.** `.blocker-link` färgades bara under
  `.modal-blocked` — den gamla modalens scope — så i skenan föll de tillbaka på
  webbläsarens blå understrykning. Sidans enda default-länk. Riktig regression.
- **`New issue` flyttade in i ytan.** En chip plus en accentfärgad textlänk gjorde
  den ovanligaste handlingen till det mest framträdande i Relations-blocket. Nu en
  rad i issue-ytan: `+ New issue in <repo>`. En kontroll färre i skenan.
- **Fotnoten vilar sist.** Mellan skenan och `DETAILS` låg den i samma dämpade
  mono-röst som rubriken och de smälte ihop till ett grått block. Metadata om filen
  hör hemma längst ned i fliken.

### Granskningsfynden från #9
- **Ytorna saknade namn.** `status`/`priority`/`agent` skickade ingen titel, så en
  skärmläsare hörde "dialog" utan att få veta vilket fält.
- **Fokusfällan låg i sheeten, inte i lagerstacken.** Där `inert` saknas ger
  `aria-hidden` ingen tab-spärr — och paletten, hjälpen och panelerna hade ingen
  egen fälla. Nu äger stacken fällan, en gång, för varje lager.
- **`.sheet-pin` nitade bara en gång.** Filterpanelen bygger listan först och
  skjuter in sitt sökfält senare (fält med >8 värden), så det fältet nitades
  aldrig. En `MutationObserver` på ytans kropp nitar det som dyker upp.
- **Fältgenvägarna staplade ytor.** `S`/`P`/`A`/`L` nådde den globala hanteraren
  även med en yta uppe.
- **Fokus återvände inte efter en skrivning.** Att bekräfta ett värde ritar om
  detaljpanelen, så knappen vi mindes var frånkopplad när återlämningen kördes. Nu
  minns vi *vilken rad* det var och tar dess nya kontroll.

- **Värdekolumnen hade ingen vänsterkant.** Följdfel av punkt ett: ramen försvann
  men paddingen stod kvar, så en kontrolls text låg 9px in medan ett rent värde låg
  flush. Kanten flyttade sig alltså 10px beroende på om fältet råkade vara *satt* —
  `Alfa` på 124, `Set etapp` på 134. Paddingen betalas nu tillbaka med negativ
  marginal (samma grepp chippen redan använde), och den flyttades från den dämpade
  spanen *inuti* chippen till chippen själv. Mätt, inte bedömt: ett test kräver att
  varje rads vänstra kant är densamma.

- **`Etapp` / `Pucks` var två obesläktade substantiv för en kant.** Ett typnamn och
  en generisk plural för de två ändarna av `parent`/`children`, så raden lästes som
  ett eget fält i stället för som andra halvan av paret under. Nu **`Part of`** och
  **`Contains`** — ett förhållande i två riktningar, som `Blocked by`/`Blocks`
  redan läses. Ordet *etapp* bor kvar där det hör hemma: på **värdet**, i väljarens
  rubrik och i tavlans Etapp-gruppering — inte som fältnamn i en produkt som redan
  heter Etapp. `data-field` behåller modellens ord (`etapp`, `pucks`), så etiketten
  är fri att ändras utan att genvägar och tester hänger på den.
- **`Etapps` som vy.** Nästan gratis: `is:etapp` fanns redan som härlett predikat, så
  vyn är en fråga och ingen ny posttyp — samma trick som varje annan vy. `G` sedan
  `E` hoppar dit, och raden visas bara när det finns etapper (en permanent nolla i
  sidomenyn är inte navigation).
  Testet mot riktig data hittade direkt ett fel i den: en etapp kan sitta i vilken
  status som helst, inklusive `inbox` som den committade tavlan döljer — så räknaren
  sa 1 och tavlan visade 0. Precis den drift `viewCounts` finns till för att
  förhindra. Ett test kräver nu att siffran i sidomenyn är samma som antalet kort.

- **Arkivväxeln nådde inte Etapps-vyn.** Följdfel av kolumnfixen ovan: jag dolde
  landade etappers *kolumn*, men frågan matchade dem fortfarande — så kortet syntes
  rakt av under varje annan gruppering (repo, agent, target, parent, priority) och
  räknades i sidomenyn. Vilka vyer som kan nå arkivet är nu en egen lista
  (`ARCHIVABLE`): `all` och `etapps` lyder växeln, `ready`/`inbox` kan inte nå det
  (deras statusar är aldrig terminala) och `attention` *ska* nå det — en flaggad
  landad puck är precis vad den vyn finns för.

- **En kontroll som inte kan ändra något erbjuds inte.** Tre döda kontroller, alla
  med regeln redan skriven någon annanstans i koden:
  - **Arkivväxeln i en vy som aldrig når arkivet.** `ARCHIVABLE` säger redan att
    `inbox` och `ready` har statusar som aldrig blir terminala — Display-menyn läste
    bara aldrig den. Nu grindad på samma tabell.
  - **`Show empty columns` i listläge.** Den läses bara av `renderColumns`;
    `renderList` släpper tomma grupper villkorslöst. Rutan var alltså ikryssad och
    inert i *varje* vy så snart man stod i lista. Board-only nu, och raden ritas om
    när man byter layout med menyn öppen — annars visar menyn en kontroll den just
    gjort meningsfull, en omgång försent.
  - **Filtervärden som inte kan träffa.** I inkorgen erbjöds alla sex statusar;
    `status:now` där ger noll. Etapp-fältet följde redan regeln i sin egen
    `values()` (*"a value that matches nothing would be a trap"*) — nu är den
    panelens regel i stället för ett fälts, och ett fält vars alla värden är
    onåbara göms helt. Nåbarheten mäts mot **vyn**, aldrig mot filtren man redan
    satt, så värden försvinner inte under handen medan man kryssar; ett aktivt
    värde står alltid kvar, annars gick det inte att kryssa av.

- **Statusväljaren visar tre sorter, inte sex steg.** `now · next · later ─ inbox ─
  done · cancelled`. De sex läste som en enda stege där `inbox` råkade ligga mellan
  `later` och `done`, alltså som ett stadium *efter* "senare". Modellen säger redan
  motsatsen på två oberoende ställen — `TERMINAL` namnger det avgjorda paret och
  `VIEWS.all` är bokstavligen `-status:inbox` — så indelningen är härledd ur de två
  och inte utskriven. En ny status hamnar i rätt grupp av vad den *är*.
  Ordningen inuti är STATUSES egen, alltså tavlans kolumnordning. Att lägga `inbox`
  först hade läst kronologiskt och matchat sidomenyn, men gett appen en andra
  ordning på samma lista och tryckt ner de tre vanligaste målen ett steg; att stängsla
  den där den står säger samma sak billigare.
  Väljarprimitiven fick `{ sep: true }` som optionsform — den ritar `.menu-rule`,
  samma linje som ⋯-menyn. Väljaren lär sig alltså aldrig vad sorterna *är*; bara
  den som bygger listan vet det. Prioritet är en ordnad skala och delas inte.

- **Nyckelkolumnen är 76px.** Provat och behållet. `Blocked by` är den längsta
  etiketten och ryms utan brytning; testet mäter `scrollWidth > clientWidth` över
  varje nyckel på en puck som har alla rader, i stället för att lita på ögat — så
  en framtida längre etikett fäller testet i stället för att klippas tyst.

- **Layouten är den man valde, i varje vy.** `renderBoard()` tvingade Ready och
  Inbox till listan *"whatever the toggle says"* — medan Display fortsatte visa
  Board som valt läge. Kontrollen påstod alltså ett val som aldrig inträffade, och
  den board-bara raden `Show empty columns` dök upp ovanför en lista.
  Två fel i ett: premissen "en fokuserad kö läser bättre som lista" gäller bara
  under *status*-gruppering, där Inbox är en kolumn och Ready två. Grupperat på repo
  eller agent har de lika många kolumner som vilken vy som helst — och ett bräde är
  då precis vad man vill ha.
  Att en vy läser bättre som lista är ett skäl att välja List (och det valet består),
  inte ett skäl att köra över den som valde Board. Samma familj som de tre döda
  kontrollerna ovanför: en kontroll får inte ljuga om vad den gör.

- **Gruppering på ett fält vyn redan låst erbjuds inte.** I inkorgen gav
  `group=status` en enda kolumn som hette samma sak som vyn — `INBOX 11` under en
  rubrik som säger `Inbox 11`. Villkoret är härlett ur hur många statuskolumner vyn
  kan visa (`columnsForFocus().length > 1`), inte ur vyns namn, så en framtida
  enstatusvy får samma behandling utan att stå med i någon lista.
  Det är den **effektiva** grupperingen som faller tillbaka på `repo`; `state.group`
  behåller det man valde. Ett besök i inkorgen skriver alltså inte över
  grupperingen man satt någon annanstans, och URL:en bär fortfarande valet.

- **Sheeten mättes mot sig själv, inte mot sidan.** Tre fel i samma yta, alla mätta:
  - **Indraget var 10px** där sidan använder 20 (topbaren) och 24 (kolumner, footer).
    Sheeten läste som en smalare spalt än allt bakom den. Nu 20 — och `.sheet .row`
    betalar tillbaka indraget med negativ marginal, så markeringen fortfarande blöder
    mot kanten medan *texten* landar på sidans rutnät. Samma grepp som värdekolumnen.
  - **Sista kontrollen slutade 10px över skärmkanten**, alltså där hemindikatorn är
    och tummen inte. Botten är 24px + safe-area nu, och `Reset to default` gick från
    18px hög till 40 — regeln "allt i en sheet är tumstort" gällde bara `.row`.
  - **Växeln var 20px hög** i en meny vars andra rader är 37, vilket är vad som såg
    skevt ut (rutan var faktiskt centrerad — mitt 722 mot etikettens 722).
- **Kryssruta, inte switch — och ritad.** En switch säger *slå på en funktion*; en
  kryssruta säger *ta med i mängden*, och det är precis vad de två gör. Menyn har
  dessutom redan tre sätt att välja (segmentkontroll, två selects); en switch hade
  blivit ett fjärde. Den native rutan var 13px bredvid 15px text — sidans enda
  kontroll utanför skalan — så den är ritad nu: 18px, `--r-xs`, accentfylld med en
  ritad bock (ett `✓`-tecken rider på typsnittets baslinje och sitter lågt i rutan
  oavsett vad line-height säger).

- **Indraget nådde inte fram — och den negativa marginalen var fel idé.** Tre fel i
  samma ändring, alla rapporterade från telefonen och alla mätta:
  - **Popover-geometri läckte in i sheeten.** `.pick-find`, `.pick-menu`,
    `.filter-pop`, `.datepop` och `.inputpop` satte bredd *och* padding, och tre av
    dem hade redan en `.sheet.<x>`-regel som tog tillbaka bredderna — paddingen var
    glömd i alla fem. Pickarna satt alltså kvar på 6px medan sidan och de andra
    sheeten låg på 20. Reglerna är scopade till `.pop` nu, där de hör hemma; undantagen
    behövs inte längre.
  - **Markeringen bleddade ut ur rutan.** Jag lät raden betala tillbaka indraget med
    `margin: 0 -11px` för att markeringen skulle nå mot kanten. Vid 20px indrag
    hamnade den valda raden 9px från skärmkanten — vilket läser som *ingen* padding —
    och i pickarna, som fortfarande hade 6px, hamnade den på **−5** och klipptes.
    Ingen negativ marginal nu: raden ligger i innehållsrutan och dess egen padding
    (9px, samma som `.fp-search`) sätter texten på samma linje som fältets.
  - **Medlemsraden låg 9px in från sidan.** Samma padding, motsatt riktning: här är
    raden *innehåll* och ska linjera med rubrikerna, så `.members` betalar tillbaka
    paddingen i stället. Och pillret: en bricka är rätt för **ett** värde på en sida,
    men fem konturkapslar i kolumn blev sektionens tyngsta element. Ordet och färgen
    gör jobbet; konturen var det som gjorde den till en bricka och är det som fick gå.
  Testet mäter nu indraget på **varje** sheet-variant (status, target, etapp, labels,
  filter, display) och kräver att ingen rad spiller ut ur innehållsrutan — det var
  precis felet med att bara titta på den yta jag råkade ha framför mig.

- **Ett indrag för hela sidan (`--pad`), och en markering som får gå utanför.**
  "Linjera sheeten med sidan" hade inget svar att ge: sidan hade **fem** olika
  sidoindrag — 20 i topbaren och vyhuvudet, 22 i puckvyn, 24 i chipraden, brädet och
  footern. Nu en token, och en yta ärver den i stället för att gissa vilken av de fem
  den skulle matcha.
  Och markeringen: **texten** är innehåll och hör på linjen; **markeringen** är ett
  tillstånd, och att boxa in den innanför linjen får den att läsa som ännu ett element
  i stället för som att raden lyser. Raden går 10px utanför linjen åt bägge håll,
  mätt *från linjen* och inte från skärmkanten — det var det som fick den att hamna
  på 9px (och −5 i pickarna) i går.
  Två fel i min egen ändring, bägge fångade av testet jag skrev till den: `.row` sätter
  `width: 100%`, så negativa marginaler **flyttade** raden i stället för att vidga
  den (10px ut åt vänster, 10px för kort åt höger) — och chipraden hade jag missat
  när jag bytte ut literalerna. Testet mäter mot sidans egen linje i stället för mot
  ett tal, så den sortens miss kan inte passera igen.

- **Blödningen säger vad som blir kvar, inte hur långt den går.** Markeringen skulle
  nå 10px utanför linjen; nu en egen token, `--sheet-gap: 8px`, och regeln är skriven
  i den: markeringen lämnar exakt 8px orörd sheet vid kanten och texten ligger kvar
  på `--pad`. Skillnaden är inte kosmetisk — `margin: 0 -10px` är ett tal vars
  *resultat* man måste räkna ut ur två andra värden, medan `calc(var(--sheet-gap) -
  var(--pad))` är påståendet självt.

- **Ett grönt test som mätte fel sak.** Blödningen syntes aldrig. Sheeten var
  indragen till `--pad` och raden drogs ut med negativ marginal — men scrollern
  (`.surface-body`, `overflow-y: auto`) **klipper vid sin padding-ruta**, så raden
  *låg* på 8 och *målades* på 22. Flush mot pillret, precis som innan. Två omgångar
  gick åt till det, för mitt test frågade `getBoundingClientRect()`, och en layoutruta
  vet ingenting om att en förfader klipper. Det svarade 8 och jag skrev "grönt".
  Rätt modell är omvänd: **sheetens egen kant är `--sheet-gap`, och varje
  innehållskolumn inuti lägger på resten upp till `--pad`.** Då är scrollerns
  padding-ruta — som också är dess klippkant — redan ute vid 8, och raden målas dit
  den ligger. Den fasta fältrutan (`.sheet-pin`) får samma behandling, annars hade en
  tänd rad lyst igenom i de 14px som blev över bredvid fältet.
  Ett nytt test (`paint.mjs`) läser **pixlarna** i en skärmdump i stället för rutor:
  det mäter var färgen faktiskt slutar. Kört mot den gamla koden faller det med
  22 mot väntat 8 — alltså hade det fångat felet första gången. `surface.mjs` frågar
  dessutom nu efter scrollerns *content*-kant och kräver att ingen rad hamnar utanför
  klippkanten.
  Läxan är inte "testa mer" utan **testa i rätt lager**: allt som handlar om vad man
  *ser* måste mätas på det som målas. Layoutrutan är en modell av sidan, inte sidan.
