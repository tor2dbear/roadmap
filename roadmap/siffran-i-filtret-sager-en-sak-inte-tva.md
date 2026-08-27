---
title: Siffran i filtret säger en sak, inte två
status: done
tags: [ui]
updated: 2026-08-27
created: 2026-08-27
---

## Goal
Talet bredvid ett filtervärde ska betyda **en** sak: hur många av korten du ser som bär
värdet. Inte två saker beroende på om raden råkar vara ikryssad.

## Research
Kom upp när `State`-facetten delades ([puck](tva-kryss-i-samma-facett-ger-noll-kort.md)).
`Is an etapp 32` stod bredvid en bräda som visade 1, vilket ser ut som en lögn men inte
var det: `countFor` modellerade **klicket**, så för en ikryssad rad svarade den *"så här
många blir kvar om du kryssar ur"* — och utan andra filter är det hela brädan.

Mekaniken var konsekvent. Problemet var att de två meningarna ser likadana ut på skärmen:

| raden är | den gamla siffran betydde |
|---|---|
| ej ikryssad | så här många får du om du kryssar i |
| ikryssad | så här många får du om du kryssar **ur** |

Ingenting i raden säger vilken av dem du läser. Och den ikryssade varianten är den som
ser mest ut som ett påstående om datan, vilket är just den som inte är det.

**Den nya regeln.** Sonden är värdet självt, mot alla *andra* sektioners filter. Bara den
egna sektionens kryss lyfts ut — annars läser varje syskon 0 så snart man kryssar i ett av
dem, vilket vore en annan sorts lögn.

Mätt mot skarp data: siffrorna står stilla på `1 / 4 / 28` genom hela turen medan brädan
går 33 → 1 → 29.

## Avgränsning
**Siffrorna summerar inte till vad två kryss ger, och ska inte göra det.** Värdena inom en
sektion överlappar — en puck kan vara både `blocked` och `blocking` — så `2 + 2` kan ge 3
kort. Det gäller facettsiffror överallt och är inte vad de är till för. Priset är att en
siffra inte längre är en exakt förutsägelse av ett klick; vinsten är att den är samma
mening varje gång.

## Verifiering
Sju kontroller i `tests/facets.test.mjs`. Den skarpaste är **stabiliteten**: siffran
bredvid en rad får inte röra sig när raden kryssas i. Tre sabotage körda var för sig —
tillbaka till klick-modellen, räkna mot hela brädan, och släpp det blandade termets andra
halva — fäller var sin uppsättning.
