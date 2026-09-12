---
title: Skroll isoleras till en axel
status: inbox
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
