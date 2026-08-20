---
title: "Tidsaxel: target-datum"
status: inbox
tags: [core, product]
updated: 2026-08-20
created: 2026-08-19
---

## Goal
Ge pucken en *när*-dimension så tavlan är en roadmap och inte en backlog — utan att
glida in på sprintar, story points och kapacitetsplanering.

## Research
Enda tidsfälten idag är `updated` och `created` (plus `stale`-flaggan som härleds ur
dem). `now/next/later` är en **ordning**, inte ett **när**: två pucker i `next` kan
vara "nästa vecka" och "någon gång i höst" utan att något skiljer dem. Alla
jämförbara verktyg har en tidsaxel — Linear (projekt-target + cycles), GitHub
Projects (iteration/date-fält). För en roadmap som ska *visas för någon annan* är
"när ungefär" halva poängen.

### Beslut: datum, inte kvartal
```yaml
target: 2026-11-30
```
Kvartalsformat (`2026-Q4`) övervägdes och valdes bort: datum sorterar sig självt,
räcker för en exakt tidslinje, och slipper en egen periodparser. Risken — att ett
datum läses som ett löfte — hanteras i **presentationen**, inte i lagringen:

- **Lagra exakt** (`YYYY-MM-DD`), **visa grovt**: "nov 2026" som standard, "om 3
  veckor" när det är nära, fullt datum bara i detaljvyn. Ett kort som skriker
  "30 NOV" skapar deadline-ångest; "nov 2026" läses som en horisont.
- **Tomt är normalläget.** Som `priority` — de flesta puckar har ingen horisont.

### Snitt
- **Frivilligt, ordnat fält** på puck *och* etapp (en etapp med `target` är i
  praktiken Linears projekt-target).
- **Genomgående**, precis som `priority` gjordes: `CONVENTION.md` / `AGENTS.md` /
  `CLAUDE.md`, adapters + harvester, `roadmap target <slug> <datum>` (+`--clear`),
  badge i signal-baren, editerbar rad i railen.
- **Sortering är nästan gratis:** `byDate()` finns redan och lägger dessutom tomma
  värden sist — exakt vad ett frivilligt datumfält behöver.
  `if (state.sort === "target") return byDate("target", 1);` + en rad i `SORTS`.
- **Filtrerbart** med jämförelse (`target:<=2026-11-30`) — se `fragesprak-delbara-vyer`.
- **Grupperbart** → tidslinjevyn, som då inte är ett eget bygge, se
  `display-meny-och-gruppering`.
- **Ny driftsignal:** `target` passerad + inte `done` → ⚠ "horisonten har passerat".
  Samma mönster som `stale` och `issue-closed`: flagga, aldrig skriv om källan.

### USP-vakt
Cede-listan avstår **sprintar och story points** — inte tid som sådan. `target`
kräver ingen ny lagring, ingen scheduler och ingen kapacitetsmodell: ett fält i
frontmatter. Risken att bevaka är den motsatta — att "vi bygger inte PM-bloat"
används som skäl att inte bygga något som faktiskt är git-nativt.

## Open questions
- Ärver ett barn förälderns `target` när det saknar eget, eller lämnas det tomt?
  (Förslag: tomt — arv som inte syns i filen är en osynlig sanning.)
- Ska tidslinjen gruppera på månad eller kvartal, och ska det vara ett val?
- Hur mjuk ska den passerade-horisonten-signalen vara? (Förslag: samma vikt som
  `stale`, inte rött.)
- `target` + `priority` + `status` + `order`: fyra axlar. Se
  `rank-skriv-order-fran-gui-t` — rollerna måste skrivas ned innan det här fältet
  landar.
