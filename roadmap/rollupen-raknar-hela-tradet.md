---
title: "Rollupen räknar hela trädet"
status: cancelled
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

`progress` byggs av **direkta barn**. Med barnbarn i bilden såg det ut som att en rot
visar "2 av 3" och tyst ignorerar allt under. Förslaget: räkna hela underträdet.

## Levererat, mätt, och återtaget

Underträdsmåttet byggdes, mättes och togs tillbaka. Det är kvar som `cancelled` snarare
än raderat, för mätningen är svaret på frågan och frågan kommer att ställas igen.

**Talet ska gå att härleda ur raderna under det.** `Contains` på en puck-sida listar
*direkta* medlemmar. Ett underträdsmått satte alltså en bricka som räknade åtta över en
lista med fem rader — en nämnare som inte fanns någonstans på sidan. Direkta barn
komponerar i stället: den som ser `3/5` kan gå ner i medlemmen som säger `1/3`, och
aritmetiken är synlig hela vägen.

**Signalerna blev *mindre* precisa, vilket var tvärtemot avsikten.** Mätt genom den nya
testbänken, på `rot done → mitten done → barnbarn next`:

| mått | flaggas | kommentar |
|---|---|---|
| direkta barn | `mitten` | mitten säger sig klar med ett öppet barn — det är lögnen |
| underträd | `mitten` + `rot` | roten flaggas för något den aldrig påstod |

Roten sa att dess enda del var klar, och den delen säger det själv. Driften hör hemma
hos den puck vars eget påstående är falskt, en nivå ner, där rättningen finns.

**Motiveringen jag skrev — "signalen var tyst" — kom ur en fixtur som inte mätte det.**
I det testet var "barnbarnet" skrivet med `parent: rot`, alltså ett direkt barn. Det
fanns aldrig något barnbarn i den uppställningen, och `rollup-open` hade flaggat roten
med bägge måtten. Jag mätte fel sak och läste svaret som ett fynd.

## Det som blev kvar, och som var värt hela turen

Skördaren hade **ingen testtäckning alls**. `resolveHierarchy()` avgör `parentRef`,
`children`, `progress` och halva signalerna — och varje tavel-test läser en *fixtur*,
så koden som producerar den riktiga payloaden mättes bara genom att titta på tavlan
efteråt. Det var därför en felmätning kunde bära hela vägen till main.

`tests/harvest.test.mjs` skriver en liten repo av riktig markdown i en temp-katalog, kör
skriptet, och läser det som skrevs. `ROADMAP_ROOT` håller varje skriven fil inne i
temp-katalogen, så en körning kan inte röra det här checkoutets `data/`. Ingen
webbläsare. Den står kvar och kodar nu **komposition**: direkta tal, och drift som
landar hos den som ljuger.

## Open questions

- `ROADMAP.md`-digesten skriver `done/total` i sin metarad och ingen kontroll läser
  digesten. Den nya testfilen är platsen att lägga en om det någonsin skaver.
