---
title: "Rollupen räknar hela trädet"
status: later
tags: [dx]
updated: 2026-09-02
created: 2026-09-02
priority: medium
target: 2026-09-21
owner: tor2dbear
agent: backend
parent: nastling-listan-nastlar-tavlan-hinkar
---

## Goal

`progress` byggs i dag av **direkta barn**. Med barnbarn betyder det att en rot visar
"2 av 3" och tyst ignorerar allt under.

## Research

`resolveHierarchy()` i `harvest.mjs` sätter `it.progress` från `it.children`, som är de
puckar som namnger mig direkt. `rollup-open` och `rollup-done` hänger på den siffran:
terminal med oavslutade barn flaggar det ena, icke-terminal med allt klart det andra.

Frågan "hur långt har det kommit?" är en fråga om **trädet**, inte om ett lager. Så
underträdet är rätt svar — men det ändrar innebörden i ett payload-fält och i två
signaler, och det är därför det är en egen puck och inte en rad i en annan.

Skörden vandrar redan skogen för att upptäcka cykler, så vandringen finns; det är
räkningen som ska byta nivå.

## Open questions

- Ska en mellannods egen rollup också räkna sitt underträd (ja, av samma skäl), eller
  bara rotens?
- Räknas mellannoden *själv* i sin förälders total? En rot med ett barn som har tre barn
  är "0 av 3" eller "0 av 4" beroende på svaret. Jag lutar åt att bara **löv** räknas —
  en nod som bara håller andra puckar är ingen egen del av arbetet.
