---
title: "Rank: skriv order från GUI:t"
status: inbox
tags: [ui, editing]
updated: 2026-08-19
created: 2026-08-19
---

## Goal
Göra "prioritera" fullt utförbart i cockpiten: dra en puck till rätt *plats* i en
kolumn och få det skrivet till git — och samtidigt reda ut de tre rank-begrepp som
i dag konkurrerar.

## Research
`ai-first-gui-cockpit` slår fast fem jobb för människan, varav **prioritera** är ett.
Det är också det enda av de fem som inte går att göra klart från GUI:t:

- **Drag & drop flyttar bara status.** `drop`-handlern i `app.js` anropar
  `changeStatus`; `order` skrivs aldrig tillbaka (det finns inget `commitOrder`).
  Släpper man ett kort mitt i en kolumn hamnar det där sorteringen säger, inte där
  man släppte det.
- **CLI:t kan det inte heller.** Inget `roadmap order`-kommando. Manuell rangordning
  = handredigerad YAML.
- **Tre överlappande begrepp utan definierad sammanvägning:** `status` (när),
  `priority` (hur mycket det spelar roll), `order` (manuell rank inom kolumn) — och
  med `target` blir det fyra (se `tidsaxel-target-horisont`).
- **Dogfood-signalen:** 26 av 32 pucker här har `order`, **2** har `priority`. Den
  rank man faktiskt använder är den man inte kan skriva från tavlan.

### Snitt
1. **`commitOrder`** — släpp mellan två kort → skriv `order` på den flyttade pucken.
   Ett fält på en fil per drag; ingen omnumrering av grannarna (glesa steg om 10, som
   pucker redan har, och halvera mellanrummet vid insättning).
2. **`roadmap order <slug> <n>`** — eller hellre `roadmap move <slug> --before|--after
   <slug>` så man slipper räkna själv.
3. **Bara i default-sorteringen.** `sortComparator` respekterar `order` enbart i
   `default`; i explicita sorteringar (datum, priority) ska drag-till-plats vara
   avstängt i stället för att tyst skriva ett värde som inte syns.
4. **Rensa upp modellen** och skriv ned den i `CONVENTION.md`: `status` = vilken
   kolumn, `order` = plats i kolumnen, `priority` = etikett/filter (inte sortering
   som standard). Alternativet — slopa `priority` och låta rank vara ensam axel, som
   Linear — är också en giltig utgång och billigare att underhålla.

## Open questions
- Behåll `priority` som eget fält, eller låt manuell rank vara den enda ordningen och
  degradera `priority` till en ren etikett? (2/32-siffran talar för det senare.)
- Glesa `order`-steg räcker länge men inte för alltid — ska ett "normalisera
  ordningen"-kommando finnas i CLI:t från start?
- Skriver drag & drop mellan kolumner både `status` och `order` i samma commit, eller
  två? (En commit — annars blir historiken brusig.)
- Mobil: drag till plats fungerar dåligt med tumme. Behövs ett "flytta upp/ner"-par i
  radens meny som skriver samma fält?
