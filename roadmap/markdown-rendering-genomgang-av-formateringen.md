---
title: "Markdown-rendering: genomgång av formateringen"
status: later
tags: [ui, editing]
updated: 2026-08-19
created: 2026-08-19
---

## Goal

Göra en samlad genomgång av markdown-renderingen (`renderMd` i `app.js`) i
puck-body, aktivitet och diskussion. Den är en liten handrullad parser och täcker
det vanliga, men vi har redan hittat luckor ett tag i taget — dags att gå igenom
den systematiskt istället för att laga symptom.

## Research

Kända luckor / att verifiera (bygg en teststräng som täcker allt):

- **Nästlad emfas** — `**fet med *kursiv* inuti**` renderas inte (regexen
  `[^*]+` bryts av det inre `*`), så `**` läcker ut bokstavligt. Sågs i
  `python-sandbox-csp-fix`-pucken.
- **Ordnade listor** — fixat (numrerade rader → `<ol>`), men verifiera blandade
  och intilliggande listor.
- **Nästlade listor** (indenterade under-punkter) — hanteras troligen inte.
- **Länkar, `code`, blockcitat (`>`), tematiska brytningar (`---`)** — inventera
  vad som stöds vs. tyst tappas.
- **Tabeller** — stöds inte; avgör om vi bryr oss (kanske medvetet utanför scope).
- Escaping/ordning: `esc()` körs före inline — kolla att `<`/`>` i kod och
  länkar beter sig rätt.

## Open questions

- Hur långt ska den lilla parsern sträcka sig innan det är värt ett riktigt
  (litet, dependency-fritt) markdown-bibliotek? USP:n är zero-backend/statisk, så
  allt måste vara inline utan bygg-steg.
- Vilken delmängd av markdown "lovar" vi i pucker? Dokumentera den i
  `CONVENTION.md` så författare vet vad som renderas.
