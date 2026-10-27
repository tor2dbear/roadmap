---
title: "Markdown-rendering: genomgång av formateringen"
status: done
tags: [ui, editing]
updated: 2026-09-02
created: 2026-08-19
---

## Goal

Göra en samlad genomgång av markdown-renderingen (`renderMd` i `app.js`) i
puck-body, aktivitet och diskussion. Den är en liten handrullad parser och täcker
det vanliga, men vi har redan hittat luckor ett tag i taget — dags att gå igenom
den systematiskt istället för att laga symptom.

## Research

**Omfattningen sattes av en mätning, och den första mätningen var fel.** Först svept
mot `data/roadmap.json` — som är en *frusen snapshot* och därför saknade nästan varje
puck den här tavlan skrivit sedan augusti. Tabeller såg ut att finnas i 1 puck och
blockcitat i 0. Mätt mot filerna på disk plus snapshotens övriga repon, 162 puckar:

- **17** tabeller — det vanligaste trasiga draget, inte ett undantagsfall.
- **7** nästlad emfas, **7** nästlade listor, **7** blockcitat, **4** bara URL:er.
- **0** tematiska brytningar (`---`).

Att den första siffran var fel ändrade ett beslut: blockcitat låg i "0 träffar"-hinken
och hörde efter mätningen hemma i rundan. Lärdomen är billig och värd att skriva ner —
**den i-repot-checkade `data/roadmap.json` är en snapshot, inte tavlan.** Att svepa
data om puckar med den är att mäta i augusti.

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

## Delivered

Ett pass över `renderMd`, med de fyra frågorna avgjorda så här:

**Parsern behölls, och skälet är säkerhet snarare än storlek.** Den escapar först och
släpper sedan igenom en vitlista, så den kan per konstruktion inte producera HTML som
inte står i funktionen. Kropparna kommer från *andras* repon och landar i `innerHTML`
på vår origin; varje riktigt markdown-bibliotek släpper igenom rå HTML som standard och
kräver därför en sanitizer också. Två beroenden för en handfull blocktyper är fel byte.
Priset betalas en gång, i blockläsningen: den ser rader som redan är escapade, så ett
blockcitat börjar med `&gt;`, inte `>`.

**Ordningen mellan inline-reglerna löstes en gång i stället för fyra.** Kodspann och
skrivna länkar lyfts ur strängen innan emfas och autolänkning kör, och läggs tillbaka
sist. Utan det når varje regel in i varje annan: `**` inuti ett kodspann blev fet, och
en bar URL inuti en href hade länkats en andra gång.

**Nästling behövde en stack, inte en flagga.** `inList` kunde bara svara "i en lista,
ja eller nej" — och det är indraget som skiljer en underpunkt från en mjukbruten rad.
Ett `<li>` öppnas nu när dess text är känd men stängs sent, eftersom en nästlad lista
ska ligga *inuti* det.

**Och regeln som gäller allt vi inte renderar:** en rad som öppnar ett okänt block
bryter stycket i stället för att vikas in i det. Det var den som gjorde en tabell till
en mening.

Renderas nu: nästlad emfas · nästlade listor · blockcitat · bara URL:er · GFM-tabeller
(`|---|` krävs, `:`-ställning respekteras, egen scroll så en bred tabell aldrig ger
sidan en sidled).

**Medvetet utelämnat.** `---` renderas fortfarande som text — 0 förekomster, och den
nya regeln gör den platt i stället för hopklistrad, vilket räcker. Bilder och rå HTML:
aldrig, det är hela vitlistans poäng. Tabellrader kräver `|` i bägge ändar (GFM tillåter
att de utelämnas) och `\|` i en cell stöds inte. En tabell eller ett blockcitat inuti en
listpunkt avslutar listan i stället för att nästlas — noll förekomster, och den
motsatta gissningen kostar mer kod än den är värd.

**Verifiering.** `tests/markdown.fixture.md` är konformanstexten och `tests/markdown.test.mjs`
mäter den (40 kontroller). Fyra sabotage fäller den var för sig: gamla strong-regexen
tillbaka, fail-better-grenen bort, nästlingen bort, kodspannens skydd bort. Bredden har
två egna kontroller i `tests/chrome.test.mjs`, i samma form som kodradens — sidan är
390 *och* tabellen är fortfarande bred i sin egen scroll — och sabotaget som låter
cellerna bryta var som helst fäller den andra medan den första står kvar.

## Open questions

- Hur långt ska den lilla parsern sträcka sig innan det är värt ett riktigt
  (litet, dependency-fritt) markdown-bibliotek? **Avgjort: inte hit.** Se
  *Delivered*. Frågan är värd att ta upp igen först om vitlistan börjar behöva
  fotnoter, definitionslistor eller nästlade blockcitat.
- Vilken delmängd av markdown "lovar" vi i pucker? Dokumentera den i
  `CONVENTION.md` så författare vet vad som renderas. Tabellfallet visar varför
  det inte räcker att dokumentera: en författare i ett *annat* repo läser inte den
  här filen innan hen skriver, så parsern måste bete sig anständigt på det den
  inte kan.
- Hör `redigeringen-byter-typsnitt-mitt-i-texten` hemma här? Den handlar om samma
  text i samma låda, fast i redigeringsläge — kanske en gemensam etapp snarare än
  en `depends:`.
