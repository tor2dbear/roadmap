---
title: "UI-primitiv och skalor"
status: now
tags: [ui, dx]
updated: 2026-08-23
created: 2026-08-23
order: 5
depends: [polering-av-egenskapsskenan]
---

## Goal
Ett komponentspråk i stället för femton engångsklasser — så att nästa funktion
ärver konsekvensen i stället för att lägga till en variant till.

## Research
Mätt ur `styles.css`, inte tyckt:

- **16 olika `border-radius`** och **14 olika `font-size`**. Halvorna (`10.5`,
  `11.5`, `12.5`) är avslöjande: det är enskilda knuffar, inte en skala.
- **Två komponenter finns två gånger.** `.rollup` ≡ `.agent-badge` (identiska
  deklarationer, den ena har bara `cursor: help` extra) och `.pick-mi` ≡
  `.user-mi` (fs13 · p 7/9 · r6 · hover panel-2). `.suggest-item` är samma sak en
  tredje gång med p 8/10 och r7.
- **Sex uppsättningar för märkesfamiljen** — `status-pill`, `issue-state`,
  `rollup`, `tagpill`, `adapted-badge`, `token`. `status-pill` och `issue-state`
  är båda "ett statusord i sin egen färg", den ena kapsel och den andra rundad
  fyrkant.
- **Nio knappformer**, och två av dem — `.date-act` och `.focusbtn` — har olika
  storlek beroende på *var de sitter*, satt via förälderselektor. Storlek är en
  egenskap hos kontrollen, inte hos platsen.
- **Tre röda literaler** för två jobb: `#c0564f` på en länk och `#cc6149` på en
  menyrad, fyrtio rader isär, betyder samma sak.

Flikarna är däremot rätt: `.tab-btn` (understruken, innehåll) och `.focusbtn`
(fylld, navigation) *ska* skilja sig — det är två olika sorters val.

## Delivered
- **`[hidden]` betyder dold.** Webbläsarens regel är `[hidden] { display: none }`,
  som varje klass med `display` slår — så varje komponent som lägger ut sig själv
  fick bära sitt eget undantag, och **sjutton** gjorde det. Den artonde
  (`.side-section`) fick aldrig sitt, och `AGENTS`-rubriken stod kvar över en tom
  lista. En global regel ersätter alla sjutton, och nästa element kan inte glömma.
- **Siffran är vad klicket visar.** Ett repo-chip räknade källans *allt* medan ett
  klick går via `goToPlace` → All pucks, som döljer inbox och arkivet: "PIA 52"
  landade på sex kort. Platser räknas nu med samma fråga klicket tillämpar — samma
  regel som vyerna redan höll sig till. Detsamma för disciplinköerna: kön är levande
  arbete, inte historik.
- **Tre röda fick namn** — `--danger` (ett destruktivt *ord*), `--urgent`
  (prioritetsmärket) och `--danger-solid` (den enda fyllda ytan med vit text). De
  hade dessutom ingen mörk variant: en hårdkodad röd följer inte temat.

- **Två skalor i stället för trettio beslut.** Radien har fem steg (`--r-xs` … 
  `--r-pill`) och typen nio (`--fs-xs` … `--fs-4xl`). Varje literal i filen är
  borta utom tre som förtjänar att vara literaler: `50%` för prickar, sheetens
  `16px 16px 0 0`, och `0.92em` för kod inuti brödtext — den sista är ett
  *förhållande*, inte ett steg, och ska följa texten den sitter i.
  Sju storlekar försvann (`9`, `10.5`, `11.5`, `12.5`, `13.5`, `14.5`, `17`) och
  elva radier. Tre former som egentligen var piller — draghandtaget,
  prioritetsstaplarna och filterstrecket — hade små radier i stället för
  `--r-pill`; de säger vad de är nu.
  Ett värde är semantiskt och inte bara estetiskt: `--fs-2xl: 16px` är golvet iOS
  kräver för att inte zooma in ett fokuserat fält. Det står i kommentaren, för det
  är inte uppenbart av namnet.

- **`.row` — den enda valbara raden.** En väljarrad, en menyrad och ett sökförslag
  var tre klasser med samma jobb och tre uppsättningar siffror (7/9 · r6, 7/9 · r6,
  8/10 · r7). Nu en komponent; *var* raden sitter avgör bara storleken, vilket är
  precis vad sheetens tumstora override är. De gamla namnen står kvar i markup som
  krokar — samma princip som `data-field`: namnet koden hänger på ändras inte när
  utseendet flyttar.
- **`.badge` — en bas, sex delta.** `.rollup` och `.agent-badge` var byte-identiska;
  de sex delade en familj men hade tre radier, fyra typstorlekar och fyra paddings.
  Nu bär basen allt gemensamt och varje namn bara sin skillnad. En fälla på vägen:
  basen låg efter två av deltana i filen, så källordningen vann och `.tagpill` föll
  från 11 till 10px. Basen ligger först nu.
- **`.linklike` saknade bas.** Den fanns bara i tre *scopade* varianter, så en
  utanför dem — "Edit body" — ärvde webbläsarens egen knapptyp, 13.33px. Sidans
  enda storlek som kom från ingenstans. Hittad av testet som kräver att varje
  typstorlek i puckvyn ligger på stegen.

- **`.btn` — en bas, sju delta.** Sju klasser bar sju uppsättningar siffror för en
  familj. Nu bär basen radie, ramtjocklek och form; varje namn bara sin storlek och
  ton.
  **En rättelse till min egen genomlysning:** jag skrev att två knappar byter
  storlek beroende på var de sitter, och att det alltid är fel. Det stämde bara för
  den ena. `.datepop .date-act` ligger i `@media (max-width: 640px)` — det är
  tumstorlek på telefon, alltså samma regel som `.sheet .row` följer, och den är
  rätt. `.side-views .focusbtn` var den verkliga: en andra variant av en kontroll
  som bara har ett hem. Den är infälld i `.focusbtn` nu, för det *är* kontrollen.

## Open questions
- Ska `.badge` och `.btn` ta färgen som modifierare (`.badge--status-now`) eller
  som `currentColor` från en förälder? Statuspillret gör redan det senare.
