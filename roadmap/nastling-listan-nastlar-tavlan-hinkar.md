---
title: "Nästling: listan nästlar, tavlan hinkar"
status: done
tags: [ui]
updated: 2026-09-04
created: 2026-09-02
priority: high
target: 2026-09-21
owner: tor2dbear
parent: hierarkin-pa-riktigt
---

## Goal

Ett träd, två ärliga projektioner. Listan får riktiga indrag; tavlan får en kolumn per
träd. Ingen av dem låtsas vara den andra.

## Research

Kanban-problemet löser sig med ett byte: `GROUPS.parent.keyOf` grupperar i dag på
**direkt förälder**. Byt till **roten** — översta förfadern i kedjan — så följer resten:

- En kolumn = ett träd. Barnbarnet hamnar hos sin far och sin farfar.
- Mellanpucken slutar vara två saker: i dag är den både kort i farfars kolumn och egen
  kolumnrubrik.
- Roten står överst i sin egen kolumn i stället för i `No parent`, och den kolumnen
  betyder äntligen det den säger: puckar som inte är i något träd alls.

Djupet inuti kolumnen bärs av korten. Föräldrachippet finns redan och är i dag *gömt*
just när man grupperar på parent (`state.group !== "parent"`) — med nästling blir det
användbart igen för nivå två och neråt.

**Avgränsning som håller omfattningen liten:** nästling *är* vad `group=parent` betyder,
inte ett tillval man lägger på vilken gruppering som helst. Ett träd spänner över
statusar, så det går inte att nästla inuti en statuskolumn. Grupperar du på status är ett
barnbarn bara ett kort med ett föräldrachip, precis som i dag.

**Cyklerna är redan betalda:** `parent-cycle` kapar länken vid skörden, så payloaden är
en skog och inte en graf. En trädvandring kan inte loopa.

## Utfall: en ärlig projektion, inte två

Titeln lovade två — och den andra höll inte. Listan nästlar (`listan-nastlar`), och
tavlan slutade gruppera på parent över huvud taget i stället för att hinka
(`kolumnen-ar-ett-trad`, avbruten med mätningen nedskriven: 19 av 173 puckar står i ett
träd, så kolumnerna blev 2 och 3 kort bredvid ett `No parent` med 28).

Regeln som blev kvar är enklare än planen: **platta facetter grupperar tavlan, den enda
hierarkin grupperar listan.**

De tre öppna frågorna, besvarade:

- `groupsOf` rördes aldrig. Den platta listan bägge renderarna delar *är* trädets
  kanter, så `listTree()` möblerar om och nycklar om ingenting.
- Roten blev rubrik — i listan. Frågan om kort-eller-rubrik i en kolumn föll bort med
  kolumnen.
- CONVENTION är omskriven: djupet är inte begränsat, och två nivåer är det vanliga
  fallet snarare än taket.

Rollupen fick också ett svar den här vägen, och även det tvärtemot förslaget:
`rollupen-raknar-hela-tradet` är avbruten, för direkta barn komponerar och
underträdsmåttet gjorde driftsignalerna sämre.
