---
title: Redigeringen byter typsnitt mitt i texten
status: inbox
tags: [ui, editing]
updated: 2026-09-01
created: 2026-09-01
---

## Goal

*Edit body* byter ut den renderade puck-texten mot en `textarea` på samma plats —
och texten växer och byter typsnitt i samma rörelse. Det läser som att man har
zoomat, inte som att man har börjat redigera.

## Research

Mätt i webbläsaren, inte tyckt (listor, inte tabell — tavlan renderar inte
tabeller, se `markdown-rendering-genomgang-av-formateringen`):

- **Renderad text** (`.modal-body`): 14px Geist, `line-height` 22.4px.
- **Redigering** (`.body-editor`): 16px Geist Mono, `line-height` 25.6px.

Två steg upp i skalan (`--fs-lg` → `--fs-2xl`) *och* proportionell → mono i ett
enda byte, i en låda vars innehåll dessutom är samma text. Mono är brett på köpet:
16px mono mäter bredare per tecken än 16px sans, så raderna bryter på andra
ställen än de gjorde en sekund tidigare.

**16px är inte godtyckligt, och det är halva problemet.** `--fs-2xl` är
uttryckligen golvet iOS kräver för att inte zooma in ett fokuserat fält (samma
kommentar står vid regeln på `@media (max-width: 640px)`, där *alla* textfält
lyfts till 16px). Men `.body-editor` sätter `--fs-2xl` **ovillkorligt** — även på
desktop, där inget golv behövs och den renderade texten är 14px.

Det ger två olika frågor med två olika svar:

- **Desktop:** ingen anledning till 16px. Editorn kan möta den renderade texten.
- **Mobil:** golvet står kvar. Då är det i stället *den renderade* texten som är
  den lilla — och alternativet är att låta båda vara 16px på telefon, vilket är
  vad `@media (max-width: 640px)` redan gör med resten av fälten.

Mono kontra sans är en separat fråga från storleken: markdown-källa i mono är ett
försvarbart val (indrag, tabeller och kodstaket radar upp sig), men då bör den
renderade sidan inte vara det enda stället där skillnaden syns som en storleks-
ändring.

## Open questions

- Ska editorn möta den renderade texten (14px), eller ska den renderade texten
  möta editorn (16px)? Det senare är en ändring av läsvyn, inte av redigeringen —
  och `.modal-body` är samma klass som används på flera ställen.
- Behåll mono i editorn? (Källan *är* kod-nära.) I så fall: justera storleken så
  att x-höjden matchar snarare än punktstorleken.
- Hör detta ihop med `markdown-rendering-genomgang-av-formateringen`, som ändå
  ska gå igenom hur puck-text ser ut? Möjlig `parent:` när den etappen finns.
