---
title: Arkivera gamla "done" på tavlan
status: done
tags: [ui]
updated: 2026-08-28
---

## Mål
Hindra att `done` växer sig plottrig över tid utan att radera historik.

## Research
Behåll filerna (konventionen säger radera aldrig), men fäll ihop/dölj `done` äldre
än N dagar i vyn, med en "visa arkiv"-knapp. Rent UI-jobb i `app.js`.

## Delivered
Levererad av annat arbete, under andra namn, efter att den här pucken skrevs.

Pucken är daterad **2026-08-15**. Arkivväxeln (`showDone`) kom 2026-08-20 med
Display-menyn, och `HIDDEN`-facket 2026-08-26. Båda gjorde jobbet utan att veta om
den här raden.

Vad som finns i dag:

- **Display → Show done & cancelled** döljer `done` och `cancelled` ur vyn.
- **`HIDDEN`-facket** visar dem som rader med antal och ett öga som tar tillbaka dem
  — precis den "visa arkiv"-knapp pucken bad om.
- Filerna ligger kvar. Konventionen bröts aldrig.

## Vad som medvetet inte byggdes
Åldersgränsen — *"dölj `done` äldre än N dagar"*. Mätt mot brädan 2026-08-28, 119
klara puckar:

| | |
|---|---|
| ≤ 7 dagar | 22 (18 %) |
| ≤ 14 dagar | 70 (58 %) |
| ≤ 30 dagar | 85 (71 %) |
| äldst | **42 dagar** |

Hela arkivet ryms i sex veckor. En N-dagars-gräns hade antingen dolt nästan ingenting
eller nästan allt — alltså samma sak som växeln redan gör, med en ratt till att ställa
in. Brädan hann inte bli gammal nog för problemet pucken förutsåg.

Blir den det, är det en ny puck med en riktig fördelning bakom sig, inte den här.

## Notes
Den kvarvarande arkivfrågan — att växeln inte sa var korten tog vägen när brädan är
grupperad på något annat än status — lagades i samma PR som stängde den här. Svaret står
i `CLAUDE.md` under *UI: one thing, one place*: arkivet säger vad det håller tillbaka i
huvudet på den kolumn som saknar det.
