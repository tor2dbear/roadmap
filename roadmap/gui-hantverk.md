---
title: "GUI-hantverk"
status: done
tags: [ui]
updated: 2026-08-27
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

## Delivered
Sju pass, alla stängda. Fyra fanns när etappen skrevs; tre kom till på vägen, vilket
är vad man ska vänta sig av arbete som delar filer — varje pass hittade fynd som hörde
hemma i ett av de andra, vilket var argumentet för att de är *en* sak.

**Den öppna frågan är besvarad, och svaret var ingetdera.** Rollupen skulle röra sig
och sedan berätta om ett antal eller en andel är det man jämför. Den rörde sig, och
`etapp-tydlighet-i-gui` prövade bägge formerna: ringen föll först, stapeln landade i
#11 och togs bort igen i #13. Vid 1–5 delar är siffran exakt och fullständig — varje
proportionsmarkering är en andra, grövre kopia av vad `2/3` redan sagt. En rak regel
längs underkanten av en helt rundad pilla klipps dessutom av radien i bägge ändar och
läser som ett understruket "2/".

Frågan var alltså rätt ställd och svaret blev att inget av alternativen behövdes.
Det är värt att skilja från "vi hann inte": måttet prövades i två former, mättes på en
telefon, och avfärdades på egna meriter.

## Open questions
