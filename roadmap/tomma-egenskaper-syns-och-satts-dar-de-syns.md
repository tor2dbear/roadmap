---
title: Tomma egenskaper syns, och sätts där de syns
status: done
tags: [ui, product]
updated: 2026-09-13
created: 2026-09-12
priority: medium
owner: tor2dbear
---

## Goal

**En egenskap utan värde ska rita ett märke, inte ingenting — och märket ska gå att trycka
på.** Rapporterat från Linear med skärmdump: varje kolumn i projektlistan visar en dämpad
platshållare där värdet fattas (`---` för prioritet, en streckad person för lead, en
streckad kalender för måldatum), och ett tryck öppnar *Change priority…* direkt i raden.

Två saker, och de är olika. Den första är läsbarhet: en kolumn med hål i läses inte som en
kolumn. Den andra är skrivvägen: att sätta ett värde ska inte kräva att man öppnar pucken.

## Research

**Krokarna finns, och det är därför det här är litet.** `PROPS` driver raden, kortet och
grupprubriken ur en enda vandring, och varje post har redan ett `has(i)`-predikat som
avgör om cellen ritar något:

```js
{ key: "priority", label: "Priority", where: "cell", cls: "list-pri", track: "44px",
  has: function (i) { return !!i.priority; }, make: function (i) { return priorityBadge(i.priority); } },
```

Det är `has` som svarar *nej* i dag och lämnar cellen tom. En `empty`-medlem bredvid `make`
är hela ritningen: vad ritas när `has` är falskt.

**Spåret finns redan.** `CLAUDE.md` skriver ut varför: *"whether a cell exists is a question
about the view, never about the puck — emptiness is per-item, so skipping the date cell for a
puck with no target would shift every cell after it one track left."* Cellen är alltså
reserverad i listan; den är bara tom. Platshållaren kostar ingen layout.

**Och skrivaren finns.** Fyra funktioner går genom `commitFields()` — `changeStatus`,
`changePriority`, `changeAgent`, `changeTarget` — och de är redan det skenet pekar på från
puckssidans rail. `openSurface()` är den enda ytan, och den ger popover vid ≥640px och ark
under. En picker i en rad är alltså inget nytt maskineri: det är samma anrop från ett annat
ställe.

**Vad som faktiskt saknas:**

1. En `empty`-renderare per egenskap i `PROPS` — det dämpade märket.
2. En koppling från märket till rätt `change*`-funktion, via `openSurface()`.
3. En grind: `ghToken()` plus skrivrätt, samma som puckssidans kontroller.

**Regeln om stängda och öppna fält gäller oförändrat.** `status` och `priority` är stängda
gränssnittsfält — ett påhittat värde committar fint och släcks av `normalize*()` vid nästa
skörd, *"a write that looks like it worked and vanishes an hour later"*. Sök-och-skapa hör
alltså bara hemma där värdemängden är öppen. Det begränsar vad en radpicker får erbjuda,
inte om den får finnas.

**`null` är ett värde, inte ett hål**, och det är vad som gör platshållaren ärlig. `priority`
är `urgent`/`high`/`medium`/`low` **eller `null` = ingen**. Linear ritar `---` och erbjuder
*No priority* som ett val med bock i. Vi har samma modell och kan säga samma sak.

**`groupSays` behöver ingen ny gren.** Under `group=priority` upprepar raden inte prioritet —
kolumnen säger det redan — och då ska ingen platshållare ritas heller. Det följer av att
`groupSays` sitter före `has` i vandringen.

## Open questions

- **Kortet har inga spår, och det avgör halva pucken.** I listan är cellen reserverad och
  platshållaren gratis. Ett kort har ingen registerhållning alls, så där skulle varje
  otilldelad egenskap lägga till ett märke — mätt behov saknas, och kanban-kortet är redan
  det tätaste vi ritar. Rimligast är **bara raden först**, med kortet som egen fråga när
  raden stått ett tag. Men det gör listan och kortet olika på ett sätt `PROPS` hittills
  undvikit, och det är priset att väga.
- **Ska platshållaren ritas utan token?** Två grindar, inte en: *läsbarheten* (kolumnen har
  en form även för den som inte kan skriva) och *skrivvägen*. Ritas märket för alla men
  svarar bara för vissa bryter det regeln *"a control that only fails when you press it is
  not gated, it is decorated"*. Ritas det bara med token får en utloggad läsare en kolumn
  med hål i — precis det pucken ska laga. Kanske: märket alltid, som ren text; pekaren och
  pickern bara med skrivrätt.
- **Vilka egenskaper?** `status`, `priority`, `agent`, `target` har skrivare. `owner` är ett
  frontmatter-fält men har ingen `change*` ännu. `repo`, `updated`, `created`, `progress`,
  `rollup` och `count` är härledda och ska aldrig få en picker — en platshållare som inte
  går att fylla är en död ruta. Listan måste alltså vara explicit i `PROPS`, inte "allt som
  har `has`".
- **Omritningen.** En skrivning från raden ritar om brädan, och kolumnernas plats bärs numera
  över en omritning per nyckel (`colPlaces`). Raden man just skrev i ska stå kvar under
  fingret — det borde följa av det som redan finns, men det är värt att mäta och inte anta.
- **Hover är inget på en telefon.** Linear avslöjar affordansen vid hover. Brädan har regeln
  utskriven elva gånger: `:hover` är ett tillstånd man inte kan lämna på touch. Platshållaren
  måste alltså synas utan hover, och träffytan får inte hänga på den.

## Utfall

Byggd som pucken skisserade — en `empty`-medlem per egenskap i `PROPS`, en gren i
cellvandringen, ingen ny yta. Tre av de fem öppna frågorna besvarades av mätning i stället
för av resonemang, och två av dem tvärtemot vad som stod skrivet här.

**Märket alltid, pickern bara med skrivrätt** — och den delningen kunde inte lånas från
railen. `propPicker({ editable: false })` lämnar en `<button disabled>`, vilket är rätt i
railen där ingenting lyssnar ovanför den och fel i en rad vars hela uppgift är att öppna
pucken: en avstängd knapp sväljer klicket helt. Mätt på 1200px utan token, ett tryck på
första radens prioritetscell: med den avstängda knappen stod `location.hash` kvar på `""`
och ingen puck öppnades; med en `<span>` öppnades `#alpha/a-parent`, som varje annan pixel
i raden. Utan skrivrätt är märket alltså ren text.

**Chipet visar märket, inte värdets namn.** `null` *är* ett värde för de här fälten, så
menyn bockar `No priority` och har rätt i det — men chipet är en annan fråga. Målat med
värdets egen etikett radbröts det till tre rader: 58×47 i en 44px-cell, och raden gick från
39px till 71. `blank` i `propPicker` är hela skillnaden: ett värde, två bredder.

**`.list-empty` var upptaget.** Det är `No matching parts`-stubben, och den bär
`display: flex; width: 100%; padding: 6px 6px 6px 12px`. Skrivet så först ärvde märket allt
det: omslaget fyllde sin 44px-cell, stod 35px högt och strecket låg 12px in. Samma misstag
som `FIELDS` en fil bort, och samma bot — namnet hör till en sak. `.prop-empty` nu, bredvid
`.prop-muted` och `.prop-pick` det ritas ur.

**En yta som ritas inuti något klickbart fanns det ingen regel för.** En ankrad popover
monteras i sin egen `anchorWrap`, och den har hittills alltid suttit i något inert — topbar,
kolumnrubrik, rail. Pickern i en rad la den inuti radens klickyta, och menyns egna rader
bubblade rakt in i den: mätt skrev `High` från en rads prioritetscell filen **och** lämnade
brädan på `#alpha/a-parent` med puckssidan öppen. Stoppat i ytans rot, inte i pickern —
nästa yta som ankras i något klickbart har samma fel och ingen anledning att minnas det här.
Bubbelfasen bara: utklicksvakten lyssnar på dokumentet i *capture* och avgör fortfarande
själv vad som räknas som utanför.

**Svaren på de fem frågorna:**

- **Kortet** — bara raden, som pucken föreslog. Listan reserverar datumspåret oavsett vad
  pucken bär, så märket kostar ingen layout där; kortet har inga spår alls. `dateCells`
  tredje argument är hela skillnaden, och att listan och kortet går isär står utskrivet
  hellre än att smygas in.
- **Utan token** — ja, som ren text. Se ovan.
- **Vilka egenskaper** — `priority`, `agent`, `target`. Inte `status`: dess `has` svarar
  alltid sant, så den är aldrig tom. Inte `owner`: det är ett frontmatter-fält utan
  `change*`, och railen drar redan samma slutsats när den döljer Assignee-raden helt. Inte
  `created`/`updated`/`repo`/`rollup`/`count`: härledda vid skörd. Listan är explicit i
  `PROPS`, inte "allt som har `has`".
- **Omritningen** — **nej, det följde inte av det som redan fanns.** Porten behåller sin
  plats av sig själv (`renderBoard` tömmer och fyller utan att mäta däremellan), men raden
  gör det inte: en skrivning bumpar `updated`, som är andra nyckeln i standardkedjan, så
  raden sorteras om under en offset som aldrig rörde sig. Mätt i en 40-radig lista på
  1200×500, skrollad till 400: porten stod kvar på 400 och raden gick från y=220 till
  **y=-241** — 461px, ut ur fönstret upptill. Under `group=none` står den still, men bara
  därför att den grupperingen föreslår `status,order` och `updated` inte ingår; det är en
  egenskap hos en gruppering, inte hos brädan. `rowPlace()` är samma idiom brädan redan
  använder tre gånger — `toggleGroup` för en fällkontroll, `segmented` för ett tryckt
  segment, `colFocus` för en fokuserad kolumn. Med den: 400 → 0 och raden 220 → 159, för ett
  färskt `updated` sorterar den till listans huvud och det finns ingen offset kvar att hålla.
  Att följa raden man rörde till toppen är svaret; att tappa den ut ur fönstret är det inte.
  Under en ordning skrivningen inte rör är den en no-op — `sort=title`, samma lista, 400 →
  400 och 220 → 220.
- **Hover** — märket syns i vila och bara *rutan* väntar på en pekare. `.pick-chip.editable:hover`
  var railens och ovaktad, skriven när ett chip bara någonsin stod i en yta; i en rad målar
  den en bakgrund och står sedan kvar under fingret. Neutraliserad och återinförd bakom
  `(hover: hover)`. Svepet i `tree.test.mjs` fick en tredje bräda med token, eftersom de två
  kontrollerna bara ritas för den som får skriva — och svepet säger vad det såg, annars
  smalnar en ändrad fixtur tyst av regeln.

**Vad som avsiktligt inte gjordes:** en *fylld* cell är fortfarande inte tryckbar. Pucken
handlar om märket för ett saknat värde; att göra varje ifylld cell till en picker vore att
ändra en befintlig interaktion i förbigående. Det är nästa fråga, och den har ett eget svar
att hitta — bland annat om raden då fortfarande kan öppna pucken någonstans.
