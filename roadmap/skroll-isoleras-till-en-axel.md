---
title: Skroll isoleras till en axel
status: done
tags: [ui]
updated: 2026-09-12
created: 2026-09-12
priority: medium
owner: tor2dbear
---

## Goal

**Ingen låda på brädan ska skrolla i två riktningar samtidigt.** En ruta skrollar i höjdled
eller i sidled, aldrig bägge — och då behöver ingen gest tolkas, ingen axel låsas och ingen
studs stängas av, för webbläsaren gör det själv.

Målet är destillerat ur tre rapporter från telefonen som visade sig vara samma sak: en
lodrät svep i listan som drog kolumnerna i sidled, en kolumnrubrik som försvann uppåt, och
ett fack som gled ur rutan. Listan fick handgjorda motmedel — `armAxisLock`, `touch-action:
pan-y`, `overscroll-behavior-x: none`, gömda indikatorer — och de är alla lappar på samma
premiss: att en ruta skrollar åt två håll.

Formen som uppfyller det är Linears, rapporterad med skärmdump: **ytterlådan enaxlig i
sidled, varje kolumn enaxlig i höjdled.** Den avskaffar de pinnade rubrikerna, skugg-kanten,
18px-bandet och fackets glidning på en gång — inte genom att laga dem, utan genom att ta bort
det de är symptom på.

## Research

Delarna, i den ordning de måste tas:

1. **`foten-flyttar-in-i-sidomenyn`** — betalningen. Ytterlådan kan inte bli enaxlig medan
   en fot behöver lodrät resa att skrolla bort i. Fristående: den gör bägge layouterna
   högre redan innan något annat byggs.
2. **`varje-kolumn-skrollar-for-sig`** — formen. Prototypad och mätt: fem deklarationer,
   och DOM:en har redan rätt struktur.
3. **`listans-motmedel-foljde-inte-med-till-kanban`** — kontrollen. Kan visa sig vara tom,
   och det är avsikten: med två nästlade enaxliga lådor gör webbläsaren låset själv. Pucken
   *mäter* att målet uppnåddes i stället för att anta det.

**Listan är redan enaxlig per låda, och det är värt att säga.** `.work` i listan skrollar
bägge axlarna — den är undantaget som blir kvar när brädan är klar. Om målet ska gälla hela
tavlan står listans egen tvåaxlighet kvar som en fjärde del, och den är svårare: gruppens
rubrik är pinnad i höjdled och `.lh-inner` i sidled, två sticky-boxar i samma scrollruta.
Det är medvetet inte med här — brädan först, och sedan avgörs om listan är samma mål eller
ett eget.

## Open questions

- **Gäller målet listan också?** Se ovan. Brädan avgörs först; listans två axlar är en
  svårare fråga och kan visa sig vara rätt som den är.
- **Vad blir kvar av `armAxisLock` när det här är klart?** Om bägge layouterna blir
  enaxliga per låda är hela funktionen — lås, fling, glidning, klickkvittot — en mekanism
  utan användare. Det är i så fall ett resultat att skriva ner, inte städning att smyga in.

## Utfall

**Uppnått för brädan.** Mätt på 390×700: `.work` skrollar ingenting, porten skrollar i
sidled, varje kolumn i höjdled. Ingen låda tar två axlar, och en vakt i `chrome.test.mjs`
mäter det — bägge halvorna, eftersom listan behåller sina motmedel och en svepande
borttagning är precis vad vakten finns för att stoppa.

De tre delarna, och vad var och en faktiskt kostade:

1. **`foten-flyttar-in-i-sidomenyn`** — betalningen, och den gav två fynd bygget inte kunde
   förutse: ett datum som bröts efter ett bindestreck i en 240px-spalt, och en
   `padding-bottom` som lade en remsa *under* det som utger sig för att vara underkanten.
   Dessutom en vinst ingen hade räknat med: bandet överlever en puckssida, vilket den gamla
   foten inte gjorde.
2. **`varje-kolumn-skrollar-for-sig`** — formen. Tog bort regressionen Codex hittat på samma
   gren, och avskaffade den pinnade rubriken, skugg-kanten, 18px-bandet och fackets glidning
   på köpet. En femte läsare ingen fråga hade ställt: låset låste fel låda.
3. **`listans-motmedel-foljde-inte-med-till-kanban`** — tom, som avsett. Den var skriven som
   en kontroll av att målet uppnåddes, inte som arbete, och det är precis vad den blev.

**Det viktigaste enskilda fyndet är vad som *inte* bär.** Portens `overflow-y: hidden` ser ut
att vara det som stoppar driften och gör det inte: sätts den tillbaka till `auto` står
kontrollen grön, eftersom gesten träffar den innersta scrollrutan. Det som bär är att
kolumnen *är* en scrollruta. Sabotaget som inte fäller något är varje gång det som lär mest.

**Och ordningen var inte kosmetisk.** Foten först, för att en enaxlig ytterlåda inte kan
rymma något som behöver lodrät resa att skrolla bort i. Tvärtom ordning hade infört en
permanent fot i steg 2 och tagit bort den igen i steg 1 — synligt för användaren, båda
gångerna.

## Kvar

**Listan är fortfarande tvåaxlig**, och det stod utskrivet som en öppen fråga från början:
`.work` skrollar bägge axlarna där, med gruppens rubrik pinnad i höjdled och `.lh-inner` i
sidled. Det är två sticky-boxar i samma scrollruta, och att dela axlarna på två element
skulle ta den lodräta pinnen med sig — exakt den bugg det fasta skalet en gång byggdes för
att laga. Listan behåller därför sina fyra handgjorda motmedel, och frågan om det är samma
mål eller ett eget är obesvarad. Den ska ställas som en egen puck när någon vill ha svaret,
inte lösas på symmetri.

**Och en konsekvens värd att titta på:** om listan någon gång blir enaxlig per låda är
`armAxisLock` — lås, fling, glidning, klickkvitto — en mekanism utan användare. Det vore ett
resultat att skriva ner, inte städning att smyga in.
