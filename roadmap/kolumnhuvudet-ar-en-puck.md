---
title: "Kolumnhuvudet är en puck, inte en etikett"
status: done
tags: [ui]
updated: 2026-09-03
created: 2026-09-02
priority: high
target: 2026-09-08
owner: tor2dbear
agent: design
parent: hierarkin-pa-riktigt
---

## Goal

Under `group=parent` är kolumnrubriken namnet på en riktig puck — men den går inte att
öppna, och en lång titel spränger huvudet. Två fel med ett gemensamt svar.

## Research

**Rubriken är inert.** I `renderColumns` är den `el("h2", null, grp.label)` — ren text,
ingen kontroll. Överallt annars på tavlan öppnar en pucks namn den: korttiteln,
föräldrachippet på ett kort (`.parent-link` är en knapp), brödsmulan. `group=parent` är
det enda stället regeln bryts — och det är stället där föräldern annars **inte finns på
skärmen** alls: den ligger i `No parent` eller i sin egen förälders kolumn.

**Långa titlar bryter layouten.** `.col-head` är `display: flex; align-items: center`
utan `min-width: 0` och utan trunkering på `h2`, så en lång titel radbryts och räknaren
och rollup-brickan centreras mot ett treradigt block. Mätt: `Brand it + split product /
instance` är 35 tecken, `Redigera pucks direkt i GUI:t` 29.

**Bara `parent` producerar godtyckligt långa etiketter.** Status, repo, agent, priority
och target är korta av konstruktion. Defekten kom alltså med parent-grupperingen, och
den blir värre med nästling.

**Den billigare halvan av fixen är inte trunkering.** `.col-head h2` bär
`text-transform: uppercase` och `letter-spacing: var(--tr-eyebrow)` — rätt för en
kategorietikett (`NOW`, `ETAPP SITE`), fel för en titel. Versaler plus spärrning kostar
15–20 % bredd och läsbarhet: `BRAND IT + SPLIT PRODUCT / INSTANCE` är både längre och
svårare att läsa än `Brand it + split product / instance`. Gör bägge och långa namn
slutar vara vardag; trunkeringen blir ett skyddsnät i stället för ett tillstånd.

**Och de två fixarna hänger ihop:** trunkering är bara försvarbar för att namnet går att
öppna. På telefon finns ingen hover, så `title=` är inget svar i sig.

## Delivered

**Rubriken är pucken, på tavlan.** `GROUPS` fick en valfri `opens(key)` som svarar på
"vilken puck heter den här kolumnen efter?". Bara `parent` har ett svar — status, repo,
agent, priority och target etiketterar sina kolumner med *kategorier*, och en kategori
har ingenting att öppna. Rubriken blir en knapp när svaret finns, och ren text annars.

**Versalerna var den billigare halvan av bredd-problemet.** `text-transform: uppercase`
plus spärrning är rätt för `NOW` och `ETAPP SITE` och fel för en titel: mätt kostar det
15–20 % av bredden *och* läsbarheten. En rubrik som namnger en puck bär pucken skiftläge
nu (`.named`), en som namnger en kategori bär kvar ögonbrynet.

**Och trunkeringen behövde `min-width: 0` för att alls kunna hända.** Ett flex-item är
som standard aldrig smalare än sitt innehåll, så `text-overflow: ellipsis` hade inte
avgjort något: titeln radbröt till tre rader och centrerade räknaren och rollup-brickan
mot ett treradigt block. Bägge lagren behövdes.

De två fixarna hänger ihop åt bara ett håll: trunkering är försvarbar *för att* namnet
går att öppna. På telefon finns ingen hover, så `title=` är inget svar i sig.

**Listan fick skiftläget och trunkeringen men inte öppnandet.** Där är hela rubriken
redan hopfällningskontrollen (`.lh-toggle`), och en knapp inuti en knapp är ogiltig —
filen säger det redan, på raden där arkivmärket och rollup-brickan läggs *utanför*
toggeln. Att flytta ut etiketten gör en rad till två träffytor, och den mindre av dem
blir hopfällningen. Det är en ändring av en kontroll som används på telefon, inte ett
namnbyte, så den frågan ligger nedan i stället för i den här commiten.

**Verifiering.** Sju kontroller i `tests/columns.test.mjs`: en kolumn namnger en puck och
dess namn är en knapp som öppnar den, `No parent` gör ingetdera, skiftlägena skiljer sig
åt rätt väg, ett långt namn är lika högt som ett kort, och vid 390px klipps namnet i
stället för att göra sidan bredare än skärmen. Tre sabotage fäller var sin del.

## Open questions

- **Listans öppnande — avgjort till (a), och byggt.** Chevronen fäller, namnet öppnar.
  Med en avgränsning som inte stod i frågan: delningen sker **bara där det finns två
  saker att göra**. En rubrik som namnger en kategori (`NOW`, ett repo, en månad) har
  ingenting att öppna och behåller hela raden som ett fällmål — den skulle annars
  förlora ett mål den använder till en delning den inte har nytta av.
  Priset är att fällmålet nu skiljer sig åt mellan *grupperingar* i stället för mellan
  layouter. Det är den mindre inkonsekvensen: den följer av vad rubriken faktiskt är,
  och en läsare som ser en delad rubrik ser också *varför* den är delad.
- Ska kolumnen breddas för långa namn i stället? Nej enligt mig — fast bredd är vad som
  gör en kanban skannbar. Skrivet här för att någon annars föreslår det.
