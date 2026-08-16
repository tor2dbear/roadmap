---
title: Sökförslag / autocomplete
status: inbox
tags: [ui]
updated: 2026-08-16
order: 50
---

## Mål
Förslag medan man skriver i sökrutan. All data ligger redan i webbläsaren, så
sökningen är redan instant — värdet är **upptäckbarhet** (vad kan jag söka på?)
och att **hoppa direkt** till rätt kort.

## Alternativ
1. **Native `<datalist>`** — ~10 rader, noll JS, men kan inte tema-stylas och är
   klumpig på iOS. Billig men trubbig.
2. **Egen dropdown (rekommenderad)** — visar matchande **korttitlar** (klick öppnar
   kortets modal direkt) och ev. **taggar/repos** (klick sätter filtret). Full
   styling-kontroll, störst nytta. ~60–80 rader + tangentbordsnav (↑↓ Enter Esc)
   och klick-utanför-stäng.
3. **Fuzzy-sök** — typo-tolerant, men overkill för ~100 kort. Inte i första versionen.

## Beslut
Bygg #2 avskalat: mest **titel-förslag → öppna kort**. Taggar/repos finns redan som
filter-chips, så förslag där är delvis redundant. Inte fuzzy till att börja med.

## Beroende / ordning
Överlappar `list-view` — sökresultat-listan kan återanvända list-renderingen. Ta
listvyn först om båda ska byggas.
