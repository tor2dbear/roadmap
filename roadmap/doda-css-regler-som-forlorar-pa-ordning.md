---
title: Döda CSS-regler som förlorar på ordning
status: later
tags: [ui, tooling]
updated: 2026-08-29
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
inte. Kandidaterna ur körningen:

| förlorare | egenskap | vinnare |
|---|---|---|
| `.brand-glyph` | width, height | `.icn` |
| `.side-eyebrow` | fem egenskaper | `.eyebrow-fold` |
| `.view-switch` | display, min-width | `.top-title` |
| `.ghost` | font-size | `.filter-btn` |
| `.column` | fyra radier | `.hidden-cols` |
| `.list-cell` | display | `.list-agent`, `.list-repo` |
| `.prop` | grid-template-columns | `.prop-keyless` |

**`.brand-glyph` är redan bekräftad som samma bugg:** rad 244 sätter `20px`, `.icn`
på rad 943 vinner med `16px`. Att den ändå ritas rätt i sidomenyn beror på att rad
1072 (`.side-brand .brand-glyph`, två klasser) sätter `17px` — så det är 20:an som
är död, och ingen har någonsin sett den.

## Open questions
- Ska sveppet bli en **kontroll i sviten** (failar på nya kollisioner, med en
  undantagslista för de avsiktliga deltana) eller ett **verktyg man kör** när man
  rör stilmallen? En kontroll som kräver undantagslista blir en lista att hålla för
  hand, vilket är precis vad räknarsvepet och tecken-sveppet fick sluta med.
- Går "avsiktlig delta" att skilja maskinellt från "oavsiktlig kollision"? En
  heuristik: en klass som innehåller `--` eller delar prefix med förloraren är en
  modifierare. Räcker det?
- Om svaret är nej: är det rätt att i stället **kvalificera** de sju kandidaterna
  ovan en och en, och låta sveppet vara ett engångsverktyg?
