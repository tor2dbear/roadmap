---
title: "Polering av egenskapsskenan"
status: now
tags: [ui]
updated: 2026-08-24
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

## Open questions
- Nyckelkolumnen är 92px. Med chippar borta känns avståndet nyckel→värde stort;
  värt att prova 76px.
