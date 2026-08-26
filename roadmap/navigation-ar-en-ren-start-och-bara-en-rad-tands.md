---
title: "Navigation är en ren start, och bara en rad tänds"
status: now
tags: [ui]
updated: 2026-08-26
created: 2026-08-26
order: 5
---

## Goal
Två buggar som en sparad vy gjorde synliga: sidomenyn tände två rader samtidigt, och
filtret följde med när man navigerade vidare.

## Research

### Två tända rader
`buildFocusControl()` avgjorde en rads läge med

```js
// A view reads as active only when we're not inside a place — otherwise the
// sidebar would highlight both "All pucks" and the repo you navigated into.
var on = state.focus === key && !inPlace;
```

Kommentaren beskriver problemet exakt — och generaliserades aldrig. En sparad vy sätter
`focus = "all"` plus en query, så både `All pucks` och `High` tändes.

Två saker gjorde fyndet större än rapporten:

- **`Testvy` bär bara `empty: "0"` och ingen query alls.** Den dubbeltände utan att något
  filter var inblandat, så en fix på "finns det en query?" hade inte fångat den. Frågan
  är inte vad som är *satt* utan om något mer specifikt redan beskriver tavlan.
- **Testet fanns i två kopior** — sidomenyn och titel-växlaren. De delar `viewsShown()`
  just för att inte kunna vara oense om vilka vyer som finns; de får inte vara oense om
  vilken som är tänd heller.

### Filtret följde med
`goToView()` rensade bara *platserna* och lät resten av frågan rida med. Applicera en
sparad vy som heter High, klicka Ready, och du stod i "Ready, fortfarande bara high" —
med chipset som enda skylt. Samma sak vid ett repo-klick.

Det var inte en regression från `ett-minne-i-stallet-for-tva`: före den lämnade
`goToView()` `state.query` orörd av samma skäl. Buggen blev bara *synlig* när sparade
vyer började användas, för det är då man har ett filter man inte själv skrev.

Motsägelsen den bryter mot står redan i koden: `applySavedView()` kör
`applyParams(paramsOf(v), true)` — en sparad vy är en **fullständig** beskrivning av
tavlan. Då måste det gå att lämna hela den.

## Delivered
- **`activeSavedView()`** — en producent för "vilken sparad vy beskriver tavlan just nu",
  läst på alla tre ställen som behöver veta det.
- **En rad i taget.** En inbyggd vy tänds bara när varken en plats eller en sparad vy
  redan äger tavlan. I båda kopiorna.
- **Navigation nollställer filtret.** En rad i sidomenyn betyder "visa mig det här", inte
  "visa mig det här, fortfarande avsmalnat av något jag glömt". Ett filter är något man
  lägger på *efter* att man kommit fram.
- **Men `Show only this` gör det inte.** Kolumnmenyns kommando är en förfining inifrån
  tavlan, inte navigation: den behåller dina andra filter och kastar dig inte ur den vy
  du står i. `scopeToPlace()` är den vägen, `goToPlace()` den andra.

## Verification
Kört i webbläsaren mot en riktig sparad vy: efter `High` är exakt en rad tänd, `Ready`
och ett repo-klick lämnar filtret bakom sig, `Testvy` (utan query) tänder bara sig själv,
titel-växlaren har inget tänt när en sparad vy äger tavlan, och `Show only this` behåller
`priority:high`.
