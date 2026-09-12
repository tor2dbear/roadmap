---
title: Foten flyttar in i sidomenyn
status: inbox
tags: [ui]
updated: 2026-09-12
created: 2026-09-12
priority: medium
owner: tor2dbear
parent: skroll-isoleras-till-en-axel
---

## Goal

`.foot` tas bort. Dess fem poster flyttar in i sidomenyn, som en fot där i stället —
oförändrade till innehållet, så värdet kan utvärderas efteråt i stället för gissas nu.

## Research

**Fotens problem var aldrig innehållet, utan att den var vågrät möblering på ett ställe där
lodrätt utrymme är dyrt.** Mätt på 390×844: 114px, tre rader, med en föräldralös `·` på en
egen rad. Sidomenyn är en lodrät spalt där utrymmet är billigt, och på en telefon ligger
den bakom menyknappen — där kostar den noll.

**Glansen finns inte redan, och det är vad som gör flytten billig.** Argumentet för en fot
är att man råkar se tidsstämpeln. Mätt som brädan ligger nu: i kanban står foten på **y=1986**
i ett 844px fönster, och i listan efter 117 rader. Den syns i praktiken bara om man letar
upp den. Vi handlar alltså inte bort en glans utan tron på en.

**De fem posterna och vad som redan finns någon annanstans:**

| post | annat hem |
| --- | --- |
| `117 pucks` | totalen finns bara här; vyrubriken och sidomenyn räknar vyn och repot |
| `generated … UTC` | inget — den bärande posten |
| `sync now` | finns i ⌘K; ligger här för att stå bredvid datumet den lagar |
| `flat digest` · `roadmap.json` | agentaffordanser; `AGENTS.md` pekar på den deployade URL:en |
| `source` | `CFG.repoUrl` är redan ett fält i Settings |

**`.side-foot` blir sticky mot botten, och skälet står redan i filen.** `.side-brand` är
`position: sticky; top: 0` med en kommentar bredvid som förklarar varför: bandet ligger
*inuti* sidomenyns egen scrollruta (`overflow-y: auto`), så "överst" höll bara vid offset 0
— på en telefon bar minsta skroll bort arbetsytraden. En fot längst ner är exakt den regeln
speglad. Sidomenyn är redan `display: flex; flex-direction: column`, så `margin-top: auto`
håller den nere när innehållet är kort.

**Vad som faller med `.foot`:** dess sidledspinne (`position: sticky; left: 0`), tillagd
i `f1461e6`/`8bd70a3` med en kontroll, och den öppna anmärkningen om att **listans** fot har
samma sidledsfel (`left: -488`) sedan listan skrevs. Bägge upphör att vara frågor när lådan
de gäller inte finns. Kontrollen tas bort tillsammans med regeln — en kontroll utan regel är
en premissrad vars premiss avskaffats, och de flyttar eller går, aldrig lappas.

## Open questions

- **Ska färskheten bli en signal i stället för ett tal?** Brädan har redan ett språk för
  *"det deklarerade stämmer inte med verkligheten"* — `signals[]`, ⚠-märket, vyn Needs
  attention. Gammal data är samma sorts faktum ett plan upp: det handlar om nyttolasten,
  inte om en puck. Ett märke som är **tyst när datan är färsk och talar när den inte är
  det** kostar 0px permanent krom och dyker upp precis när det spelar roll. Tröskeln är
  inte påhittad: synken går varje timme, så äldre än ~2h betyder att schemat missat.
  Medvetet inte byggt här — flytta först, utvärdera sedan, och den är värd något även om
  resten av trädet aldrig byggs.
- **Bär totalen sin rad?** `117 pucks` är det enda talet i foten man inte gör något med.
  Den flyttar oförändrat nu; frågan ställs när raden stått i sidomenyn ett tag.
- **Blir `sync now` kvar bredvid datumet?** De två är en mening — knappen lagar talet den
  står bredvid. Flyttar tidsstämpeln till ett märke flyttar knappen dit med den.
