---
title: Två kryss i samma facett ger noll kort
status: done
tags: [ui]
updated: 2026-08-27
created: 2026-08-27
---

## Goal
Att kryssa i två rader under **State** ska ge unionen av dem, som i varje annan facett
i panelen. Idag ger `Is an etapp` + `In no etapp` **noll kort** — ett resultat som inte
kan vara rätt för något par: 1 + 27 av brädans 32 puckar, alltså 28 kort och inte noll.
(De två är *inte* hela brädan — de fyra som ligger i en etapp faller utanför båda.)

## Research
Rapporterat från telefonen med fyra skärmbilder. Ofiltrerat: 32 puckar, varav
`Is an etapp` 1, `In an etapp` 4, `In no etapp` 27. Kryssa i de två som täcker 28 av
dem, och brädan visar 0.

**Felet sitter på tre ställen som alla antar ett värde per `is:`-term.**

`toggleFilterValue` lägger ett *eget term* per värde för `is` och `has`, till skillnad
från alla andra fält som samlar sina värden i ett term:

```js
if (field === "is" || field === "has") {
  …
  else terms.push({ field: field, op: "is", values: [value], neg: !!neg });
```

`termMatches` läser bara `t.values[0]` (`IS_STATES[t.values[0]](item)`), och
`serializeTerms` skriver bara ut `values[0]`. Så även om ett term *bar* två värden skulle bara det
första överleva en serialisering till `?q=`.

`runQuery` AND:ar term. Två kryss blir alltså "är en etapp **och** står utanför varje
etapp", vilket är tomt per definition. Varje annat fält går genom `t.values.some(…)`
på rad 451 och OR:ar i stället — och `countFor`:s egen kommentar säger uttryckligen att
modellen *är* OR: *"clicking Next gives `status:now,next` (an OR — a bigger set)"*.
Regeln finns och är nedskriven; `is:` följer den bara inte.

**Men rak OR över hela listan är fel medicin.** `State` är inte en facett, det är tre
som råkat hamna i samma lista:

| Dimension | Värden |
|---|---|
| beroenden | `ready`, `blocked`, `blocking` |
| etapp-tillhörighet | `etapp`, `member`, `standalone` |
| flaggor och källa | `flagged`, `stale`, `adapted` |

Inom en dimension är union det enda rimliga — de är varandras alternativ. *Mellan*
dimensioner är dagens AND faktiskt användbart: `is:ready is:member` betyder "redo, och
ligger i en etapp", vilket är en fråga man vill kunna ställa. Byter man rakt av till OR
blir samma par "redo **eller** i en etapp", en större och tröttare mängd. Det vore en
regression för alla par som i dag fungerar.

## Open questions
**Två vägar, och den andra är troligen rätt.**

1. **OR inom `is:`.** Minsta ingreppet: låt ett `is:`-term bära flera värden, i alla tre
   koden ovan. Löser det rapporterade fallet, men gör tvärdimensionella par till
   unioner och tar därmed bort en fråga som fungerar i dag.
2. **Dela `State` i tre facetter.** Då blir Linears vanliga regel — OR inom en facett,
   AND mellan facetter — exakt rätt beteende utan något specialfall. Kostar en
   omgruppering av panelen och tre namn som måste vara bra. Den här ser mer ut som
   formen problemet har.

**Räkningarna är en egen fråga, och de är avsiktliga.** I bild 2 står `Is an etapp 32`
bredvid en bräda som visar 1. Det är inte en bugg i sig: `countFor` modellerar
*klicket*, så ett ikryssat värde svarar "så här många blir kvar om du kryssar ur" — och
med inget annat filter på är det hela brädan. Mekaniken är konsekvent, men raderna ser
likadana ut oavsett vilken av två meningar de talar, så läsaren kan inte veta vilken
det är. Värt att avgöra i samma veva, för med union på plats blir det ikryssade värdets
siffra meningsfull igen.

**En kontroll saknas.** `tests/board.test.mjs` täcker facket och chipparaden, men inget
test kryssar två värden i samma facett. Fixen bör komma med ett som gör det, i minst
två facetter — annars är det bara den här dimensionen som är bevakad.
