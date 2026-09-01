---
title: "Markdown-rendering: genomgång av formateringen"
status: later
tags: [ui, editing]
updated: 2026-09-01
created: 2026-08-19
---

## Goal

Göra en samlad genomgång av markdown-renderingen (`renderMd` i `app.js`) i
puck-body, aktivitet och diskussion. Den är en liten handrullad parser och täcker
det vanliga, men vi har redan hittat luckor ett tag i taget — dags att gå igenom
den systematiskt istället för att laga symptom.

## Research

Kända luckor / att verifiera (bygg en teststräng som täcker allt):

- **Nästlad emfas** — `**fet med *kursiv* inuti**` renderas inte (regexen
  `[^*]+` bryts av det inre `*`), så `**` läcker ut bokstavligt. Sågs i
  `python-sandbox-csp-fix`-pucken.
- **Ordnade listor** — fixat (numrerade rader → `<ol>`), men verifiera blandade
  och intilliggande listor.
- **Nästlade listor** (indenterade under-punkter) — hanteras troligen inte.
- **Länkar, `code`, blockcitat (`>`), tematiska brytningar (`---`)** — inventera
  vad som stöds vs. tyst tappas.
- **Tabeller** — stöds inte, och det är värre än att sakna stöd. Egen rubrik nedan.
- Escaping/ordning: `esc()` körs före inline — kolla att `<`/`>` i kod och
  länkar beter sig rätt.

## Tabeller: sedda i skarpt läge

Pucken `etapp-site#demofixturen-driver-isar-fran-produkten` har en tabell i
kroppen. Så här renderar tavlan den — verifierat genom att köra `renderMd` på
källan, inte gissat:

```
<p>| | | |---|---| | fixturens ålder | 13 dagar | | etapper (<code>parent</code>
/rollup) | 0 av 14 puckar | | sparade vyer | saknades |</p>
```

Det är alltså inte "tabeller saknas" utan **tabeller blir aktivt värre än
ingenting**: varje rad som inte matchar rubrik/lista/kodstaket faller till
`para.push(...)`, och paragrafbufferten viker ihop mjukbrutna rader med
mellanslag — så hela tabellen, avgränsarraden `|---|---|` inräknad, klistras till
en enda mening. Samma regel gör att `---` som tematisk brytning tyst försvinner in
i närmaste stycke.

Två skilda beslut, och det andra behövs oavsett hur det första faller ut:

1. **Ska vi rendera tabeller?** GFM har dem, författare skriver dem, och de går
   inte att avråda ifrån i efterhand — det som redan står i ett källrepo renderas
   som det är. En rad-baserad GFM-tabell (rubrikrad + `|---|`-rad + kroppsrader)
   är ~15 rader i `renderMd` och behöver ingen ändring i `mdInline`.
2. **Vad gör vi med det vi inte renderar?** En obekant blockstruktur ska inte
   kokas ihop till ett stycke. Alternativen: låt raden stå kvar som egen rad
   (`<br>` i stället för mellanslag när nästa rad börjar med `|`), eller släpp
   igenom den orörd i `<pre>`. Att *tappa* den vore ärligare än dagens soppa.

## Open questions

- Hur långt ska den lilla parsern sträcka sig innan det är värt ett riktigt
  (litet, dependency-fritt) markdown-bibliotek? USP:n är zero-backend/statisk, så
  allt måste vara inline utan bygg-steg.
- Vilken delmängd av markdown "lovar" vi i pucker? Dokumentera den i
  `CONVENTION.md` så författare vet vad som renderas. Tabellfallet visar varför
  det inte räcker att dokumentera: en författare i ett *annat* repo läser inte den
  här filen innan hen skriver, så parsern måste bete sig anständigt på det den
  inte kan.
- Hör `redigeringen-byter-typsnitt-mitt-i-texten` hemma här? Den handlar om samma
  text i samma låda, fast i redigeringsläge — kanske en gemensam etapp snarare än
  en `depends:`.
