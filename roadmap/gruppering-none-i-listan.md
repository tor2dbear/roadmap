---
title: "Ingen gruppering alls i listan"
status: done
tags: [ui]
updated: 2026-09-10
created: 2026-09-02
priority: low
target: 2026-09-30
owner: tor2dbear
parent: hierarkin-pa-riktigt
depends: [sortering-ar-en-kedja]
---

## Goal

`group=none` i listlayouten: en platt lista utan rubriker.

## Research

Koden är redan byggd för det. Tre hjälpfunktioner som frågar om grupperingen öppnar med
`if (!g.field) return …` — `columnTerm`, `termAboutGroup`, `groupConstrained` — så en
grupp *utan fält* är en form filen redan förutser. Varje valfri medlem är vaktad:
`g.cls`, `g.tint`, `g.headExtra`, `g.write`. Det mekaniska är en post i `GROUPS` plus
att `groupUsable("none")` bara svarar ja i listan; `effectiveGroup()` finns exakt för
att falla tillbaka i tavlan.

**Två beslut som är design och inte kod:**

- **Rubriken måste bort — men då tystnar arkivet.** Regeln är att arkivet säger vad det
  håller tillbaka i huvudet på den kolumn som saknar det. Utan huvud blir dolda
  done-puckar tysta igen, vilket är precis buggen regeln skrevs för. Svaret som passar
  in: rita huvudet *bara* när arkivet har något att säga, och låt det bära enbart
  märket.
- **Sorteringen blir hela strukturen**, och därför beror den här på kedjesorteringen:
  `order` sätts per statuskolumn, så platt kolliderar varje kolumns 10 med varje annan
  kolumns 10. Utan en riktig sortering är en platt lista en godtycklig ordning.

## Open questions

- Ska `group=none` ärva den senaste sorteringen, eller föreslå en egen när man slår på
  den? Det förra är förutsägbart, det senare är hjälpsamt precis en gång.
  **Svar: ingetdera — den föreslår, och förslaget viker för ett val.** Frågan förutsatte
  att alternativen var "ärv" eller "skriv", och det tredje läget är det brädan redan
  använder på ett ställe till: `autoDateField` visar det datum ordningen handlar om, i
  frånvaro av ett val och aldrig över det. Ett *förslag* ärver alltså en vald kedja
  ordagrant och ersätter bara förvalet, som under den här grupperingen är det enda som
  inte betyder något.

## Delivered

- **`GROUPS.none`** — en gruppering utan `field`. Det är hela integrationen: `columnTerm`,
  `termAboutGroup` och `groupConstrained` öppnar var och en med `if (!g.field) return …`,
  och varje valfri medlem (`cls`, `tint`, `headExtra`, `write`) var redan vaktad. Ingen
  ny gren någonstans i frågespråket, facket eller chipsraden.
- **`LIST_ONLY = { parent: 1, none: 1 }`** — grupperingarna som kräver listan, som en
  tabell och inte som ett andra `=== "parent"`. `parent` är en hierarki och kan inte bli
  kolumner; `none` är kolumnernas frånvaro, vilket är samma sak sagt från andra hållet.
  `groupUsable` och `effectiveParams` frågar tabellen, så `group=none&layout=board`
  stryks ur länken precis som `group=parent` alltid har gjort.
- **`headless`: huvudet ritas bara när arkivet har något att säga**, och bär då enbart
  märket — ingen färgruta, inget namn, ingen fällkontroll. En rubrik som heter
  `All pucks` ovanför hela listan är en etikett som upprepar sidan; men utan huvud alls
  hade arkivet tystnat, och den tystnaden är precis vad märket skrevs för. Samma form som
  arkivstubben en gren ner, minus de två delar som namnger en grupp.
- **`archivedMark(n, key, where)`** — märket namnger platsen puckarna saknas från.
  "in this column" pekade på något som inte ritas någonstans på sidan under den här
  grupperingen.
- **`sortChain()` / `proposedSort()`** — en gruppering får föreslå en ordning, och `none`
  är den enda med en åsikt. `order:` är puckens plats *inom sin kolumn*, så utan kolumner
  väver förvalskedjan ihop en `now`-puck med rank 20 mellan två `done` med 10 och 30, efter
  ett tal som aldrig betytt något över den gränsen. `status,order` är tavlans egen
  läsordning utplattad. En funktion och inte en gren per konsument, för menyn läser den
  också: en meny som visar en kedja tavlan inte ritar är exakt det fel den saknade `✕` på
  sista nyckeln finns för att förhindra.
- **`Reset ordering` jämför mot förslaget**, inte mot `DEFAULT_SORT`. Mot konstanten
  ritades en återställning på en orörd kedja vars tryck landat på samma rader — en
  kontroll som inte gör något är värre än en som saknas.
- **Frånvaron av ett sorteringsval är `null`**, inte `DEFAULT_SORT` — samma distinktion
  `props` redan gör. Det var granskningsfyndet: en förvalskedja som också är ett giltigt
  val kan inte dubbla som frånvaron av ett, så under den här grupperingen gick
  `order,updated` inte att be om alls. Vad som *skrivs ner* mäts på samma sätt mot
  grupperingens förslag i stället för mot konstanten, så en sparad vy och den levande
  brädan är fortsatt överens om vilka strängar som är frånvarande.
- **En fällning under en huvudlös gruppering betyder ingenting**, och länken kunde ändå bära
  en. `headlessGroup()` frågas i två domäner: `effectiveParams` stryker nyckeln ur ett
  främmande params-objekt, `applyParams` tömmer `state.collapsed`. Det senare stänger den
  lucka filen redan namngav — *"`setDisplay` rensade redan fällningarna när grupperingen
  ändrades; navigeringen hade ingen motsvarighet"*.
- **`tests/grouping.test.mjs`** — 32 kontroller. Varje fix backades ur och rätt kontroll
  föll: huvudet återkom med namn och fällkontroll, märket sa "column" igen, brädet ritade
  `All pucks` som enda kolumn, ordningen blev `Now Later Next Now …`, återställningen dök
  upp på en orörd kedja, `collapsed=%00` blev kvar i länken, och `order,updated` föll
  tillbaka till `[Status, Manual]`.

## Granskningsfynd

Två P2 från Codex, bägge reproducerade i webbläsaren före fix och saboterade efter.

1. **`collapsed` under en huvudlös gruppering.** `?layout=list&group=none&collapsed=<NUL>`
   behöll nyckeln i URL:en och tände Display-pricken medan alla sju rader stod öppna.
2. **Ett val som råkar vara förvalet.** `state.sort === DEFAULT_SORT` var både "förvalet"
   och "inget valt", så `order,updated` gick inte att be om under grupperingen: menyn skrev
   kedjan, kedjan lästes som frånvaro, förslaget kom tillbaka. Fixen är `props`-mönstret
   (`null` = inget val) — men **första försöket gick för långt**: att sluta stryka
   `DEFAULT_SORT` ur URL:en helt fällde tre kontroller i `sort.test.mjs` (`?sort=default`
   och en riktning vänd fram och tillbaka lämnade bägge förvalskedjan i länken). Regeln var
   rätt hela tiden — skriv inte ner det brädan ritar ändå — men mätt mot fel förval. Den
   mäter mot `proposedSort()` nu.
