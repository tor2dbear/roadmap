---
title: "Tidsaxel: target-horisont"
status: inbox
tags: [core, product]
updated: 2026-08-19
created: 2026-08-19
---

## Goal
Ge pucken en *när*-dimension (en horisont, inte ett datum-löfte) så tavlan är en
roadmap och inte en backlog — utan att glida in på sprintar och story points.

## Research
Enda tidsfälten idag är `updated` och `created` (plus `stale`-flaggan som härleds ur
dem). `now/next/later` är en **ordning**, inte ett **när**: två pucker i `next` kan
vara "nästa vecka" och "någon gång i höst" utan att något skiljer dem.

Alla jämförbara verktyg har en tidsaxel — Linear (projekt-target + cycles), GitHub
Projects (iteration/date-fält), Productboard (timeframes). För en roadmap som ska
*visas för någon annan* är "när ungefär" halva poängen, och det är den fråga tavlan
i dag inte kan svara på alls.

### Snitt
```yaml
target: 2026-Q4      # eller 2026-11 — grov horisont, inte ett deadline-löfte
```
- **Ett frivilligt, ordnat fält** på puck *och* epic (se
  `puck-hierarki-parent-rollup` — en epic med `target` är i praktiken Linears
  projekt-target). Tomt = ingen horisont, som `priority`.
- **Grovkornigt med flit:** kvartal eller månad, inte datum. Ett `YYYY-MM-DD` bjuder
  in till deadline-teater och drift-städning som ingen orkar.
- **Genomgående**, precis som `priority` gjordes: `CONVENTION.md` / `AGENTS.md` /
  `CLAUDE.md`, adapters + harvester, `roadmap target <slug> <horisont>` (+`--clear`),
  badge i signal-baren, editerbar rad i railen, en sortering.
- **En tidsvy** (senare): kolumner per kvartal i stället för per status — samma data,
  annan gruppering, samma kod som en gruppera-på-fält-listvy.
- **Ny drift-signal:** `target` passerad + inte `done` → ⚠ "horisonten har passerat".
  Ärligt, självrättande, och exakt samma mönster som `stale` och `issue-closed`.

### USP-vakt
Cede-listan i `CLAUDE.md` avstår **sprintar och story points** — inte tid som sådan.
`target` kräver ingen ny lagring, ingen scheduler och ingen kapacitetsmodell: det är
ett fält i frontmatter som pekar på ett kvartal. Risken att bevaka är motsatt: att
"vi bygger inte PM-bloat" används som skäl att inte bygga något som faktiskt är
git-nativt.

## Open questions
- Kvartal (`2026-Q4`), månad (`2026-11`) eller båda tillåtna? (Förslag: båda, en
  regex; sortera på periodens slut.)
- Ärver ett barn förälderns `target` när det saknar eget, eller lämnas det tomt?
- Ska `target` + `priority` + `status` sammanvägas i en enda default-sortering, eller
  förblir de tre oberoende axlar man väljer emellan? (Se
  `rank-skriv-order-fran-gui-t` — samma spänning.)
- Fältnamn: `target`, `horizon` eller `due`? (`due` lovar för mycket.)
