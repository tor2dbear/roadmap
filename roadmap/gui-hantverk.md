---
title: "GUI-hantverk"
status: now
tags: [ui]
updated: 2026-08-24
created: 2026-08-24
order: 5
---

## Goal
Ta tavlan från *fungerar* till *känns byggd* — ett komponentspråk, en overlay-primitiv,
en polerad egenskapsskena och en etapp som går att läsa. Fyra pass som delar samma
kod och samma granskningsfynd, och som därför är värda **en** rollup.

## Why this is an etapp and not a tag
Testet vi landade på: en etapp är arbete man vill ha en enda rollup för — där *"hur
långt har det kommit?"* är en riktig fråga med ett riktigt svar. Det utesluter de två
sakerna en etapp lätt förväxlas med:

- **Ordningen saker hände i** — det är `created`, och i ett repo vars historik är en
  produkt som växer ligger nästan allt "inuti" den första pucken.
- **Vad som möjliggjorde vad** — det är `depends:`, och en hierarki byggd på den
  grunden är beroendegrafen ritad en gång till.

Medlemmarna här rör samma filer (`app.js`, `styles.css`) i samma vecka, och varje
pass har hittat fynd som hör hemma i ett av de andra. Det är vad som gör dem till
delar av en sak snarare än fyra sammanträffanden.

## Members
Se `Contains` — relationen är authored på barnen (`parent:`), som konventionen kräver.
Den enda som sitter här av arbetsskäl snarare än tematiska är `skapa-puck-ur-valjaren`:
den hör lika mycket hemma i `gui-editing` (skrivvägen), men arbetet sker här. En puck
har en förälder, och det är en verklig kostnad för att slippa en andra posttyp.

## Open questions
- Rollupen står på `0/5` tills något av passen stängs. Det är först när den rör sig
  som vi vet om ett *antal* eller en *andel* är det man faktiskt jämför — se
  progressringen i `etapp-tydlighet-i-gui`.
