---
title: En bred kodrad drog ut hela puckvyn
status: done
tags: [ui]
updated: 2026-08-28
created: 2026-08-28
---

## Goal
En puck ska aldrig göra sidan bredare än skärmen. Brett innehåll scrollar i sin egen
låda; sidan står stilla.

## Research
Rapporterat från telefonen med två skärmbilder: en puck ritades i **större text** än
den bredvid, *och* sidan gick att dra i sidled. Två symptom, en orsak — och orsaken är
den mindre uppenbara av dem.

Panelen blev bredare än skärmen, och en mobil webbläsare läser en för bred layout som
ett skäl att blåsa upp varje typsnitt på sidan. Den större texten var alltså inte en
egen bugg utan en följd, vilket är varför den bara syntes på vissa puckar. Mätt vid
390px skärmbredd:

| Puck | sidans bredd |
|---|---|
| `fragesprak-delbara-vyer` | **804** |
| `email-verification-lazy` | 727 |
| `brew-install-progress` | 540 |
| `python-sandbox-csp-fix` | 390 — ingen kod i brödtexten |

**`overflow-x: auto` fanns redan på kodblocket, och var aldrig det som saknades.** En
scroll-behållare fortsätter skjuta upp sitt innehålls minimibredd genom föräldrarna
tills någon förfader *får* krympa. `.detail-pane` är ett grid-item, och ett grid-items
`min-width` är `auto` — "aldrig smalare än mitt innehålls minimum". Ett `<pre>` är en
enda lång rad utan något minimum att tala om, så panelen växte med den.

`min-width: 0` på panelen är den tillåtelsen. Kedjan mättes: `.detail-content` ensam
gjorde ingen skillnad (540 kvar), panelen ensam räckte (390).

## Avgränsning
**Att låta koden radbrytas hade också stoppat sidscrollen, och vore fel svar.** En
terminalutskrifts rader *är* dess innebörd. Blocket ska förbli för brett och gå att
scrolla i sig självt — därför kräver testet bägge sakerna, och sabotaget som byter till
`pre-wrap` fäller den andra kontrollen medan den första fortfarande passerar.

`Discussion`-fliken använder samma panel, så en fix täcker bägge markdown-ytorna.

## Verifiering
Fyra kontroller i `tests/chrome.test.mjs`, mätta i telefonvyport med ett kodblock
injicerat i fixturen. Två sabotage: `min-width` tillbaka till `auto` (657 mot 390), och
`pre-wrap` i stället (sidan ryms men blocket har slutat vara brett).

Svept mot skarp data: sju puckar med breda kodblock, alla 390/390 efteråt, alla med
kodblocket i egen scroll.
