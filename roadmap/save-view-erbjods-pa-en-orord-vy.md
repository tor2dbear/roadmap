---
title: Save view erbjöds på en orörd vy
status: done
tags: [ui]
updated: 2026-08-28
created: 2026-08-28
---

## Goal
Chipraden ska vara tyst när du inte ändrat något. Den regeln fanns redan skriven för
sparade vyer; den ska gälla de inbyggda vyerna också.

## Research
Rapporterat från telefonen med en röd pil rakt på knappen: stående i **Ready to take**,
inget filtrerat och inget omgrupperat, erbjöd chipraden ändå *Save view*. Samma sak på
**Etapps**.

Koden sa redan vad som var rätt, för sparade vyer:

> *in a view, untouched → nothing. Offering "Save view" here invites you to save what is
> already saved.*

Men grenen som skriver den knappen frågar `activeSavedView()`, och en inbyggd vy är
ingen sparad vy. Den föll därför till `!inView`-grenen och grindades bara på
`Object.keys(viewParamObject()).length` — och `viewParamObject()` innehåller `view:
"ready"`. Alltså: alltid något att spara, så fort du lämnat standardbrädan.

Följden är inte bara en knapp för mycket. Skrivvägen hade sparat den: en post i
`board.config.json` identisk med raden som redan står i sidomenyn — samma lista under
två namn, vilket är precis den drift `viewsShown` skrevs för att undvika ("All pucks 31
/ Standalone 31").

## Plan
`ownParams()` — vad brädan bär **utöver** vyn den står i:

```js
function ownParams() { var o = viewParamObject(); delete o.view; return o; }
```

Bara `view` dras bort. Varje annan nyckel i `viewParamObject` är redan ett icke-default,
alltså något du gjort, vilket är varför standardbrädan svarar tomt precis som förut.

Regeln lades i **skrivvägen**, inte i knappen. Titelväxlaren och ⌘K erbjuder dörren
ovillkorligt och lutar sig mot `saveCurrentView`:s avslag, så det är det enda stället
regeln kan gälla alla tre. Knappen läser samma fråga — vilket är vad kommentaren redan
sa att den skulle göra.

Avslaget fick två besked, för "this is the default board" är falskt när du står i Ready:

- standardbrädan → *Nothing to save — this is the default board*
- orörd inbyggd vy → *Nothing to save — "Ready" is already a view*

En förfining ovanpå en inbyggd vy är fortfarande din: `Ready + gruppering` sparas som
`{ view: "ready", group: "repo" }`. "Ready, grouped by repo" är en vy; "Ready" är en
dubblett.

## Notes
**En andra bugg låg under den första**, och testerna kunde inte skrivas ärligt utan att
den fixades.

`var TOKEN_KEY = "roadmap-gh-token";` stod bredvid `ghToken()` på rad 5916. Den
top-level `renderBoard()` som målar första brädan står på rad **5883** — 33 rader
tidigare. `var` hissar deklarationen men inte tilldelningen, så vid första målningen
frågade `ghToken()` efter localStorage-nyckeln `undefined` och svarade `""` för en
webbläsare som hade en token.

Varje token-grindad yta saknades alltså tills något ritade om: öppna en delad länk med
ett filter i och chipraden hade ingen *Save view* förrän du rörde brädan; klicka på en
rad i sidomenyn och den dök upp. Det är också därför buggen ovan syntes för dig — du
klickade dig till Ready — men inte vid en direkt sidladdning.

Deklarationen flyttad till toppen. En konstant som läses under boot måste tilldelas före
boot, vilket i en enda lång IIFE betyder överst.

Tre sabotage, alla biter:

| Sabotage | Faller på |
|---|---|
| knappens grind tillbaka | `Ready, orörd` och `Etapps, orörd` visar `["Save view"]` |
| bara skrivvägens grind tillbaka | dörrarna säger olika: knappen tyst, titelmenyn öppnar namnfältet ändå |
| `TOKEN_KEY` tillbaka under boot | 5 fel — varje positivt fall och delade-länken-kontrollen |

Den andra raden är skälet att testa knappen och skrivvägen som ett par: om de kan säga
olika är det de ogrindade dörrarna som faktiskt committar, och grinden är dekoration.
