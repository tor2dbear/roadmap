---
title: Döda CSS-regler som förlorar på ordning
status: later
tags: [ui, tooling]
updated: 2026-08-30
---

## Goal
Hitta de regler i `styles.css` som deklarerar något och aldrig får det — de som
blir lika på specificitet och avgörs av vem som råkar stå sist.

## Research

`.lh-caret` deklarerade `width: 13px` och karetten ritades i **16**, för `.icn`
sätter varje ikon till 16 och står 376 rader längre ned. Samma klass-vikt, senare
position, tyst vinst. Regeln var verkningslös **hela sin livstid** — och
kommentaren ovanför den påstod motsatsen ("the caret's width is kept so the labels
stay aligned"), vilket också gjorde en stubbes paddning 3 px fel eftersom den
räknades ur regeln i stället för ur sidan.

Filen är 133 000 tecken. Frågan är inte om det finns fler.

### Ett svep finns, och det är validerat

En audit som läser `document.styleSheets`, plockar ut varje **enkelklass**-regel och
frågar varje element i DOM:en om det bär två klasser vars regler sätter samma
egenskap. Kört över åtta vyer plus en öppen puck i varje:

```
med .lh-caret återinförd som bar klass     33 fall
med den lagad                              31 fall
```

De två som försvinner är exakt karettens `width` och `height` — alltså mäter sveppet
det det påstår.

**En bugg i sveppet är värd att skriva ner**, för den kostade en runda: `walk()`
frågade `if (r.cssRules)` för att avgöra om en regel var en behållare. Sedan CSS
nesting har *varje* style-regel en egen (tom) `cssRules`-lista, så villkoret var
sant för alla 721 reglerna och sveppet hoppade över hela filen och rapporterade
noll. Det ska vara `r.cssRules && r.cssRules.length`.

### De 31 är inte 31 buggar

Det mesta är avsiktligt: en modifierare som slår sin bas är hela poängen med
"base och delta" som `styles.css` bygger på — `.btn` → `.btn--icon`, `.row` →
`.hidden-col`, `.icn` → `.x-icn`. De hör hemma sist.

Signalen är den **omvända** riktningen: när en *specifik* komponentklass förlorar
mot en *generisk* verktygsklass. Då läser regeln som att den ska vinna, och gör det
inte.

### Den listan gick inte att lita på, och det är puckens viktigaste fynd

Första utkastet av den här pucken bar sju "kandidater" hämtade ur körningen. Sedan
gicks alla sju igenom för hand mot `styles.css`. **En var en bugg. Fem var avsiktliga
eller ofarliga. En är tvetydig.**

| par | vad det faktiskt är |
|---|---|
| `.brand-glyph` → `.icn` | **bugg.** Rad 244 sätter `20px`, `.icn` på rad 943 vinner med `16px` |
| `.side-eyebrow` → `.eyebrow-fold` | avsiktligt, med en **kommentar ovanför sig** som säger varför |
| `.prop` → `.prop-keyless` | avsiktlig envariant, också kommenterad |
| `.ghost` → `.filter-btn` | generisk förlorar mot specifik — den **avsedda** riktningen |
| `.column` → `.hidden-cols` | samma värde (`var(--r-lg)`) två gånger; ingen skillnad att se |
| `.list-cell` → `.list-agent`/`.list-repo` | ligger i `@media (max-width: 640px)` — **ingen kollision alls** |
| `.view-switch` → `.top-title` | oavgjort: `min-width` är samma värde, `display` skiljer `inline-flex`/`flex` på ett element som är flex-container hur som helst |

Det som gick fel är precis det pucken påstod att den gjorde: **riktningsfiltret kördes
aldrig.** Tabellen var de råa paren i filordning, presenterade som om de hade sorterats
på "specifik förlorar mot generisk". Fem av sju pekar åt andra hållet eller åt inget
håll, och en av dem — media query-raden — är inte ens samma villkor.

Två av felen är av sorten ett verktyg kan fånga: media query-paret ska aldrig ha
räknats, och lika-värde-paret är ofarligt per definition. **De andra tre är det inte.**
`.eyebrow-fold` och `.prop-keyless` bär var sin kommentar som säger rakt ut att de är
avsiktliga deltan, och `.ghost`/`.filter-btn` skiljer sig från `.brand-glyph`/`.icn`
bara i vilken klass som *är* komponenten — vilket inte står någonstans i CSS:en.

**`.brand-glyph` är alltså fortfarande den enda bekräftade döda deklarationen**, och
den hittades för hand, inte av tabellen. Att den ändå ritas rätt i sidomenyn beror på
att rad 1072 (`.side-brand .brand-glyph`, två klasser) sätter `17px` — så det är 20:an
som är död, och ingen har någonsin sett den.

## Open questions
- Ska sveppet bli en **kontroll i sviten** (failar på nya kollisioner, med en
  undantagslista för de avsiktliga deltana) eller ett **verktyg man kör** när man
  rör stilmallen? En kontroll som kräver undantagslista blir en lista att hålla för
  hand, vilket är precis vad räknarsvepet och tecken-sveppet fick sluta med.
- Går "avsiktlig delta" att skilja maskinellt från "oavsiktlig kollision"? Genomgången
  ovan säger att den föreslagna heuristiken — `--` eller delat prefix — inte räcker:
  `.eyebrow-fold`, `.prop-keyless` och `.hidden-cols` är alla avsiktliga och ingen av
  dem matchar den. Två billigare filter fångar däremot något verkligt och kan skrivas
  först: **hoppa över par som inte gäller under samma villkor** (media query, `:hover`,
  `[data-theme]`) och **hoppa över par som sätter samma värde**. Det som blir kvar
  efter dem är fortfarande blandat — men blandningen är då minst ärlig.
- Om svaret är nej: är det rätt att i stället **kvalificera** de sju kandidaterna
  ovan en och en, och låta sveppet vara ett engångsverktyg?
