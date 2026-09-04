---
title: Vyn väljer sina egenskaper
status: next
tags: [ui, product]
updated: 2026-09-04
created: 2026-09-04
priority: high
target: 2026-09-30
owner: tor2dbear
agent: design
---

## Goal

Välja **vilka egenskaper som visas** — status, prioritet, agent, repo, ägare, skapad,
uppdaterad, target, etiketter, rollup — och att valet är en del av vyn: det ligger i
URL:en, följer med en delad länk och sparas med en sparad vy.

## Research

**Uppsättningen finns redan; det som saknas är valet.** Både kortet och listraden ritar
en fast uppsättning fält, och varje fält är redan sin egen vaktade rad — `if
(item.priority)`, `if (item.agent)`, `if (item.owner)`, `if (item.progress)`. Det är
alltså inte en omskrivning av renderarna utan en fråga till dem: *är det här fältet
påslaget i vyn?*

- **Listraden** är ett rutnät med fasta spår: `18px | namn | prioritet | agent | repo |
  datum`. Att stänga av ett fält är att ta bort både cellen och dess spår, annars står
  en tom kolumn kvar och håller sin bredd.
- **Kortet** lägger sina märken i en rad (`card-meta`) och behöver bara sluta lägga dit
  dem.
- **Datumet är redan ett val, fast automatiskt.** `cardDateField()` väljer fält efter
  hur man sorterat: sorterar man på `created` visas `created`, på `target` visas
  `target`, annars `updated`. Regeln finns för att en lista som sorterats på ett datum
  och visat ett annat läste som blandad. Ett handval måste antingen ersätta den regeln
  eller ligga ovanpå den — och det är den enda riktiga designfrågan i pucken, inte det
  mekaniska.

**Var det bor är redan bestämt av två existerande beslut.**

1. **`VIEW_KEYS`** i `app.js` är de åtta nycklar en vy består av
   (`view, q, group, layout, sort, done, empty, collapsed`), samma nycklar i URL:en som
   i `views[]` i `board.config.json`. En nionde (`fields`) ärver därmed delbara länkar
   och sparade vyer gratis. `effectiveParams()` är den enda normaliseraren och är där
   ett fält som inte kan betyda något i den aktuella layouten ska falla bort — precis
   som `empty` gör utanför tavlan och `collapsed` utanför listan.
2. **Display-menyn** är redan hemmet för "hur mycket visas": layout, gruppering,
   ordning, `Show done & cancelled`, `Show empty columns`. En rad till, med en
   undermeny av kryssrutor, är den formen menyn redan har (`DISPLAY_FIELDS` →
   `renderDisplayValues`).

**Det finns redan ett automatiskt val att inte bryta.** På smal skärm döljer
stilmallen agent och repo i listan (`@media (max-width: 640px)`). Ett handval och en
breakpoint som bägge stänger av samma fält får inte hamna i konflikt: den ena säger vad
du vill se, den andra vad som får plats. Rimligast är att breakpointen fortsätter vara
ett tak — det du valt bort syns aldrig, det du valt syns när det ryms — men att den då
inte längre är en *tyst* regel, för nu står den bredvid en kryssruta som säger något
annat.

## Vad som gör den värd hög prio

Tavlan har fått fler egenskaper än en rad rymmer: prioritet, agent, ägare, target,
rollup, blockerare, flaggor, etiketter. På 390px trängs de redan om titeln — det var
precis vad `1 archived part`-märket gjorde med `Nästling…` i nästlingsarbetet, och
lösningen där var att flytta *en* sak till en egen rad. Det är en lokal räddning av ett
generellt problem: uppsättningen är inte densamma för en fleet-vy som för en
prioriteringsgenomgång.

## Open questions

- **Ersätter valet `cardDateField()` eller ligger det ovanpå?** "Visa skapad" när man
  sorterat på target är ett rimligt val och en olycka, i samma klick.
- **Ett val eller ett per layout?** Listan har spår, kortet har märken; samma
  uppsättning i bägge är enklare att förklara och sämre för bägge. `effectiveParams`
  kan bära det, men två uppsättningar är två saker att spara.
- **Vad kan aldrig stängas av?** Titeln, uppenbart. Puck-glyfen bär repofärgen, och
  varningsmärket är driftsignalen — att kunna dölja den är att kunna dölja att något är
  fel.
- **Räknas det som filter eller som display?** Det är display (chipparaden talar om
  filter), men gränsen är värd att skriva ner: `is:flagged` gömmer kort, `-flagged`
  skulle gömma ett märke.
