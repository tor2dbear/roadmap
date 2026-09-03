---
title: "Rollupen räknar hela trädet"
status: done
tags: [dx]
updated: 2026-09-03
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

## Delivered

`progress` räknar hela **underträdet**. `resolveHierarchy()` vandrar ner genom
`children` — säkert, eftersom cyklerna redan är kapade två steg tidigare, så det som
återstår är en skog.

**Öppna frågan i den här pucken besvarades tvärtemot vad jag lutade åt.** Jag skrev att
bara löv borde räknas. Fel: en puck med barn är fortfarande en puck, med egen status och
egen kropp, och att utesluta den ur räkningen vore att göra den till en **behållare** —
vilket är den andra posttyp modellen uttryckligen inte har. Alla ättlingar räknas.

`children` är oförändrat de **direkta** barnen. Det är relationen filen skriver; bara
måttet bytte nivå.

## Skördaren hade ingen testtäckning alls

Det är det egentliga fyndet. `resolveHierarchy()` avgör `parentRef`, `children`,
`progress` och halva signalerna — och varje tavel-test läser en *fixtur*-payload, så
koden som producerar den riktiga mättes bara genom att titta på tavlan efteråt.

`tests/harvest.test.mjs` skriver en liten repo av riktig markdown i en temp-katalog,
kör skriptet, och läser det som skrevs. `ROADMAP_ROOT` håller varje skriven fil inne i
temp-katalogen, så en körning kan inte röra det här checkoutets `data/`. Tio kontroller
på 0,3 sekunder — ingen webbläsare.

**Vad sabotaget avslöjar är mer än en siffra.** Med rollupen tillbaka på direkta barn
blir roten `1/2` i stället för `2/4` — men framför allt blir `rollup-open` **tom**. En
rot som påstår sig klar medan ett barnbarn står öppet flaggades alltså inte alls. Det
var inte bara ett tal som pekade fel; det var en signal som var tyst.

## Open questions

- Bägge frågorna nedan är besvarade i *Delivered*: en mellannods rollup räknar sitt eget
  underträd, och mellannoden räknas själv i sin förälders total.
- Kvar: `ROADMAP.md`-digesten skriver `done/total` i sin metarad. Den ärver det nya
  måttet gratis, men ingen kontroll läser digesten — den nya testfilen är en plats att
  lägga en om det någonsin skaver.
