---
title: "Tidsaxel: target-datum"
status: done
tags: [core, product]
updated: 2026-08-20
created: 2026-08-19
order: 30
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

## Delivered

**Fältet, hela vägen.** `target: YYYY-MM-DD` i konventionen; `normalizeDate()` i
adaptern släpper allt som inte är ett riktigt datum i stället för att gissa; alla
items bär fältet (adapterade källor får `null`), så payloadens form är oförändrad.

**`roadmap target <slug> <datum>`** (+`--clear`). En bar månad (`2026-11`) betyder
*i slutet av den* och skrivs som månadens sista dag — så `target:<=2026-11-30`
inkluderar hela november. Ogiltigt datum vägras med ett tydligt fel.

**Exakt lagring, grov presentation.** Kortet visar `◷ Nov 2026`, eller "in 5 days"
när det är nära; railen visar båda (detaljen är där precision hör hemma). Ett kort
som skriker "30 NOV" hade lästs som ett löfte.

**Tidslinjen — utan ny renderare.** `GROUPS.target` hinkar på månad, kronologiskt,
"No target" sist. Att släppa ett kort i en månad sätter horisonten till månadens
sista dag — samma "i slutet av"-läsning som CLI:t. Det var hela vinsten med att
göra gruppering till en variabel i föregående pass.

**Sortering** (`Target (soonest)`) via befintliga `byDate` — odaterade sist utan
extra kod. **Filtrering** med jämförelser (`target:<=2026-11-30`) via befintliga
`FIELDS`. Båda blev en rad var, som pass 1 och 2 lovade.

**Driftsignal `target-passed`** när horisonten gått och pucken inte är terminal:
⚠ på kortet, en förklarande rad ("Target 2026-08-10 has passed (10 days ago) —
move the horizon or land it?"), egen sektion i digesten, och pucken dyker upp i
Needs attention. Källan skrivs aldrig om — samma kontrakt som `stale`.

**Var signalen syns:** kortet bär det datumfält vyn handlar om, så i tidslinjen
markeras en passerad horisont i fältets egen färg; i status-vyn är det ⚠ som bär
signalen. Ingen dubbelvarning.

Verifierat: 17 fall i headless Chromium (filter, sortering, månadskolumner,
"No target" sist, grov etikett, signalen i två vyer, rail-raden på/av, menyns
val) + pass 1 och 2 som regression. Skörden testad end-to-end: fältet, digestens
`◷ datum ⚠` och signalen.

**Testhorisonterna är rensade.** Jag satte `target` på tre pucker för att köra
kedjan skarpt och tog bort dem efteråt — påhittade horisonter i en riktig roadmap
läses som beslut. Sätt riktiga med `roadmap target <slug> 2026-11`.

## Medvetet inte byggt
- **Kvartalsgruppering** — månad räcker tills en horisont ligger så långt bort att
  månaden är låtsasprecision. Ett val i Display-menyn om det behövs.
- **Arv från etapp till barn** — se den öppna frågan nedan; arv som inte syns i
  filen är en osynlig sanning.

## Open questions
- Ärver ett barn förälderns `target` när det saknar eget, eller lämnas det tomt?
  (Förslag: tomt.) Tas i `puck-hierarki-parent-rollup`.
- `target` + `priority` + `status` + `order`: fyra axlar. Rollerna är beskrivna i
  `CONVENTION.md` men beslutet om `priority` ska överleva vid sidan av manuell rank
  ligger kvar i `rank-skriv-order-fran-gui-t`.
