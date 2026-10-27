---
title: "Etapp heter parent"
status: done
tags: [ui, dx]
updated: 2026-09-03
created: 2026-09-02
priority: high
target: 2026-09-08
owner: tor2dbear
parent: hierarkin-pa-riktigt
---

## Goal

Tavlan kallar en puck med barn för *etapp* — samma ord som produkten heter. Byt till
**parent**, som är vad filen och payloaden redan säger.

## Research

Ordet sitter grundare än det ser ut. **Formatet är redan rätt:** det författade fältet
är `parent:`, payloaden bär `parent` / `parentRef` / `children` / `progress`. Ingen
`.md`-fil behöver ändras. Relationen är dessutom redan omdöpt — raderna heter *Part of*
och *Contains* sedan ett tidigare pass.

Kvar står ordet bara som **substantiv**: grupperingens etikett (`Etapp`, `No etapp`),
vyn (`Etapps`), och chippet på kortet. Av 170 rader i `app.js` som nämner det är
**114 kommentarer**; det synliga är ungefär ett dussin strängar.

**Två saker gör det till mer än en smakfråga:**

- Ägaren av verktyget hittade inte sin egen funktion. Gruppering på parent har funnits
  hela tiden; namnet dolde den.
- **"No etapp" innehåller alla etapper.** En rot saknar förälder och hamnar där — som
  kort, samtidigt som den är en egen kolumn. Med `No parent` läser det rätt.

**Inte `epic`**, trots att `epic:` redan är en accepterad alias: både koden och
CONVENTION går ur vägen för att säga att det inte finns någon epic-post att öppna, och
"epic" är precis ordet som får en läsare att förvänta sig en. Behåll det som
inmatningsalias, inte som visningsord.

## Delivered

Ordet är borta ur allt utom två ställen där det ska stå kvar: repo-namnen
(`tor2dbear/etapp`, `etapp-site`) och alias-tabellerna.

**Aliasen är hela poängen med bytet.** `is:etapp` och `?view=etapps` ligger i länkar
som redan är skickade och i sparade vyer som redan är committade. Bägge lever vidare:
`?view=etapps` skrivs om till `parents` när URL:en läses, och `is:etapp` kanoniseras
vid **parsning** — inte som ett andra registrerat predikat, vilket är hur `orphan`
bars förut. Skillnaden är synlig: ett predikat gör att termen fungerar men att
facettpanelen inte kan kryssa raden den valde, för panelen slår upp sina värden på
namn. `orphan` flyttade till samma tabell och slutade ha det problemet på köpet.

**`No etapp` hette fel, inte bara gammalt.** Kolumnen samlar de puckar som *inte* har
någon förälder — vilket varje förälder är. Med `No parent` läser den rätt.

Bytt: grupperingens etikett, vyn (`Parents`), facettens tre värden (`Is a parent` /
`Has a parent` / `Standalone`), signaltexterna, chippet, glyfens titel, väljaren,
toasterna, CSS-klasserna (`.parent-chip`, `.parent-link`, `.parent-name`,
`.is-parent`), ikonnamnet, funktionsnamnen (`parentChip`, `recountParent`,
`parentCandidates`) och 113 kommentarsrader. Tangentbordet fick `G P`; `G E` står kvar
bredvid, för muskelminne är inte värt att bryta för en bokstav ingen annan använder.

**En bugg föll ut av testerna som inte hörde till bytet.** Två kontroller adresserade
kort med `.card.first()` och `.card.nth(1)` — vilket kort som ligger först beror på hur
fixturens titlar sorterar mot varandra, så att döpa om en *orelaterad* puck öppnade en
annan puck och felet läste som en saknad Discussion-flik. De namnger vilken puck de
menar nu.

**Verifiering.** Sju kontroller i `tests/views.test.mjs`: `?view=etapps` landar i
Parents, sidofältet säger Parents och inte Etapps, `is:etapp` och `is:orphan` skrivs om
i URL:en och matchar fortfarande kort, och kolumnen heter `No parent`. Tre sabotage
fäller var sin del.

## Open questions

- `is:etapp` och `?view=etapps` ligger i delade länkar och i sparade vyer i
  `board.config.json`. `FIELD_ALIAS` visar mönstret för fält; `is:`-värden behöver
  samma kanonisering så bägge stavningarna funkar. Utan den vaknar en sparad vy som
  inte matchar något.
- Ska CSS-klasserna (`etapp-chip`, `is-etapp`) och ikonnamnet byta med? De syns inte,
  men lämnas de kvar står ordet i koden för alltid.
