---
title: "Nästling: listan nästlar, tavlan hinkar"
status: now
tags: [ui]
updated: 2026-09-03
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

## Open questions

- `groupsOf` returnerar en platt lista som *båda* renderarna delar. Ett träd är den enda
  saken som rör vid den delningen — det är därför det här är den strukturella biten.
- Ska roten vara ett kort i sin egen kolumn, eller *är* rubriken roten? Rubriken som
  puck ger ingen dubblering men gör två föräldrar olika behandlade: roten blir rubrik,
  mellanpucken förblir kort. Avgörs i `kolumnen-ar-ett-trad`.
- CONVENTION säger "Depth isn't limited, but two levels is the point". Efter det här är
  två nivåer inte längre poängen, bara det vanliga fallet — texten måste skrivas om.
