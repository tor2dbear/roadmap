---
title: "Sorteringsmenyn är en lista, inte två"
status: done
tags: [ui]
updated: 2026-09-09
created: 2026-09-09
priority: medium
owner: tor2dbear
parent: hierarkin-pa-riktigt
depends: [sortering-ar-en-kedja]
---

## Goal

Kedjesorteringen gav ordningen rätt modell men fel yta. Rapporterat från en telefon, med
skärmdump: menyn ritade **två listor** — kedjan, sedan hela katalogen under den — och det
enda som skilde dem åt var en liten siffra och några ikoner vid högerkanten. Nio nästan
identiska rader. Därför bar ytan en mening som förklarade vilka som var vilka:

> *Add a key — it breaks the ties the ones above leave.*

Klagomålet var precis rätt ställt: **när en yta behöver en förklarande text har strukturen
misslyckats.** Meningen är en diagnos, inte något att skriva om.

Två sidoanmärkningar i samma rapport visade sig vara samma fel en våning ner: *"idag kan
jag inte sortera asc/desc"*. Katalogen var nio poster som kodade tre datumfält × två
riktningar som egna nycklar, och bakade in riktningen i namnet på de fyra andra
(`Priority (high→low)`, `Title A–Z`). Alltså: `Recently updated` och `Oldest updated` var
två katalograder för en fråga, medan `Priority låg→hög`, `Title Ö→A`, `Status done→now`
och `Target senast→snarast` inte gick att be om alls.

## Research

Notion användes som referens, i två skepnader, och de sa olika saker.

**Telefonen** ger varje nyckel ett *kort*: fältraden med en `>`, riktningen som en egen rad
stavad med värdena (`Sortera nytt → gammalt`, `Sortera A → Ö`), och `Radera` i rött inuti
kortet. Sedan `+ Lägg till sortering` och `Radera sortering`. Kortgränsen bär "de här hör
ihop" utan en enda siffra — och utan någon förklarande mening.

**Desktop** ger samma innehåll som *en rad*: `⠿ [Fält ▾] [Ascending ▾] ✕`, plus samma två
rader under.

Tre saker föll ut av jämförelsen:

1. **Riktningen stavas med värdena, inte med "stigande/fallande"** — och det gör vi redan,
   fast inlåst i nyckelnamnen. Ändringen är att flytta den texten från namnet till en
   kontroll.
2. **Notion har två former för samma innehåll.** Det är inte tillgängligt för oss:
   `openSurface` lovar att byggaren aldrig får veta vilken skepnad den fick, och ett kort
   tre rader högt är fel i en ankrad popover. Ett kort hade alltså krävt att löftet bröts.
3. **Fältraden har en `>`** — man kan byta *vilket fält* rad 1 är, på plats. Vår modell
   kunde inte det: för att ändra första nyckeln fick man ta bort den (kedjan blev en
   kortare) och lägga till den igen, där den hamnade sist. Det gör om-ordning till en
   sällanhändelse i stället för huvudvägen, vilket är extra värt för oss eftersom vi inte
   kan dra.

## Beslut

- **Riktning blir en egenskap på nyckeln.** `SORT_FIELDS`: sju fält, var och en med ett
  förval och bägge etiketterna; `sortCmp` sätter ett tecken på svaret. Nio poster blir sju
  fält och fyra nya frågor går att ställa.
- **En nyckel är `field`, eller `field-asc`/`field-desc` när riktningen inte är fältets
  förval.** Kortaste stavningen är den vanliga, så `order`, `status`, `priority`, `target`
  och `title` är oförändrade; `updated-desc`/`created-desc` kortas till `updated`/`created`
  — samma nyckel under ett annat namn, eftersom bägge läses till samma kedja.
  `DEFAULT_SORT` stavas därmed `order,updated`.
- **Ett fält får bara stå en gång.** `updated,updated-asc` är två svar på en fråga, och det
  andra kunde aldrig nås.
- **Menyn blir en lista.** Katalogen flyttar bakom `＋ Add a key`. Då finns det en lista
  kvar, och meningen har inget att göra — den är borttagen, inte omskriven. Siffrorna gick
  med den: med en lista *är* positionen läsbar ur stapeln.
- **En rad per nyckel, inte ett kort** — `[↑] Fält  riktning  ✕`. Raden är den form som
  håller i bägge skepnaderna, vilket kortet inte gör. Samma skäl gör att `↑` stannar i
  bägge: drag hade fungerat i popovern, som inte är dragbar, men en mekanism som är
  näst bäst på desktop kostar mindre än den första sprickan i `openSurface`-regeln.
- **Riktningen är en växel, inte en väljare.** Två alternativ, så en chevron hade lovat en
  lista med två rader i och kostat ett tryck till för samma svar.
- **Fältet byts på plats**, och tar då sitt eget förval: `newest → oldest` är inget
  `priority` kan vara. Att välja om det fält som redan står där är medvetet en no-op — annars
  hade ett tryck som såg ut som ingenting nollat en riktning man just vänt.
- **`Manual` får ingen riktning**, och skälet är inte symmetri: en vänd manuell rank hade
  tyst stängt av *dragningen*, eftersom `manualRank()` frågar efter exakt nyckeln `order`
  först i kedjan. En kontroll vars enda synliga verkan är att slå av en annan kontroll är
  sämre än ingen kontroll. Suffixet ignoreras därför i stället för att bara vara oanvänt:
  `order-desc` läses tillbaka som `order`, så inte ens en handskriven länk kan be om det.
  Den ojämna raden som blir kvar är den ärliga formen — det finns ingen fråga att svara på
  där, och både en spärrad kontroll och en död etikett hade påstått motsatsen.
- **`arrow-up` läggs till i ikonuppsättningen.** En chevron är en *riktning*, en pil är en
  *förflyttning*. Uppsättningen hade alla fyra chevroner och ingen pil alls, så "flytta upp
  den här nyckeln" ritades med samma tecken som överallt annars betyder "det finns mer
  ovanför" — en vikning, en caret, en meny. Formen kontrollerades i bägge skepnaderna innan
  den påstods hålla: lådan på 390px och popovern på 282px, noll spill på varje rad.
- **`Reset ordering`** är en smal nollställning. Displays egen "Reset to default" sätter
  tillbaka alla sju display-nycklarna, så det fanns ingen väg att släppa en ordning utan att
  också släppa grupperingen, layouten och egenskaperna man just satt. Ritas bara när kedjan
  inte redan *är* standarden.

## Granskningsfynd och egna fel

- **Spacern bar en kontrolls klass.** Första raden har ingen `↑` men behöver en lika bred
  lucka, annars stegar fältnamnen 24px åt vänster på rad ett. Den ritades som
  `<span class="dp-sort-act dp-sort-gap">` — vilket gjorde "hur många kontroller har den här
  raden" till en fråga med fel svar, och la en `<span>` i varje mängd som ställer den.
  Hittades av en kontroll som räknade knappar på den sista kvarvarande nyckeln och fick 1
  där svaret är 0. Egen klass nu.
- **En kontroll som mätte fel sak, igen.** Testsonden frågade `.dp-sort-act .icn` för att se
  om raden hade en `↑` — men `✕` är också en `.dp-sort-act` med en ikon, så rad ett svarade
  ja. Frågar `[title^="Move"]` nu.

## Delivered

- `SORT_FIELDS` + `sortField`/`sortDir`/`sortKeyName`/`sortCmp` ersätter `SORT_KEYS`.
  `SORT_DATE_FIELD` är borta — vilket datum en nyckel handlar om är fältets egen sak
  (`SORT_FIELDS[…].date`), inte en andra tabell med en rad per nyckel *och riktning*.
- `renderSortChain` ritar en rad per nyckel; `renderSortPick` är nivå 3, i samma yta med en
  väg tillbaka — aldrig en andra overlay, av samma skäl som `props` ritar kryssrutor på
  plats.
- `styles.css`: `.dp-chain*` → `.dp-sort*`. Fältnamnet ger först och riktningen sedan; ingen
  av dem får klämma ikonkontrollerna, vilket är listrubrikernas regel en yta bort.
- `tests/sort.test.mjs`: 44 kontroller. Nya grupper för riktning per fält, ett fält en gång,
  fältbyte på plats, lägg till + nollställ — och en som mäter att **ingen not finns kvar**,
  eftersom det var det som rapporterades. Plus en som mäter raden på **390px**, där felet
  rapporterades: `target,order` ritar menyns bredaste rad (`soonest → latest` är katalogens
  längsta etikett), och kontrollerna behåller sina 34px. Saboterad genom att göra
  `.dp-sort-act` töjbar: `[[34,55],[59,59]]` mot `[[34,34],[34,34]]`.
- `tests/display.test.mjs` väljer ordning genom `Add a key` nu — raderna heter sitt fält, så
  `Title A–Z` finns inte att klicka på. Det felet gömdes två gånger av att svitens utdata
  gick genom `tail -6`, som både klipper bort vilken fil som kastade *och* maskerar
  exitkoden. Kör den osorterad.

Utanför: ingen dragsortering (se beslutet), och ingen riktning som är egen URL-nyckel —
den rider på `sort`, som redan är en av `VIEW_KEYS`.
