---
title: Vyn minns sin egen display
status: inbox
tags: [ui, product]
updated: 2026-09-08
created: 2026-09-08
priority: high
owner: tor2dbear
---

## Goal

Displayinställningarna — gruppering, layout, ordning, egenskaper, arkivväxeln, fällda
grupper — ska höra till **den vy man gjorde dem i**, inte till tavlan som helhet. Ställer
man om `All pucks` till gruppering på parent ska Inbox inte tyst byta med den.

## Research

**Reproducerat, med Display-menyn och inte bara en länk** (det är den vägen som *sparar*):

```
från början        : {}
Display → Grouping → Repo på All pucks
                   : lagrat {"group":"repo"}   url ?group=repo
→ Inbox            : url ?view=inbox           kolumner: Etapp · PIA · Cadence · Méta-Matic
→ Ready            : url ?view=ready&group=repo  kolumner: Etapp · PIA · Cadence · Méta-Matic
```

Grupperingen följer med till bägge. **Och Inbox visar den utan att URL:en säger det** —
`effectiveParams` stryker `group=repo` där, eftersom Inbox är en enda statuskolumn och
`eff()` då faller tillbaka från `status` till `repo` ändå. Inställningen är alltså osynlig
i länken och synlig på skärmen, vilket är den svåraste sorten att upptäcka.

**Regeln finns redan, formulerad för filtret.** `goToView()` bär den ordagrant:

> *Navigation is a fresh start. Clearing only the places left the rest of the filter riding
> along: apply a saved view called High, click Ready, and you were in "Ready, still only
> high priority" — with the chip the one thing saying so. […] leaving one has to leave all
> of it, or the rows in the sidebar stop meaning what they say.*

`goToView` nollar alltså `state.fromView` och hela frågan — men rör inte `state.group`,
`state.view`, `state.sort`, `state.props`, `state.showDone`, `state.showEmpty` eller
`state.collapsed`. Det är samma sorts släpande tillstånd som stycket beskriver, en våning
bort.

**Och det kolliderar med ett annat uttalat beslut**, som pucken måste avgöra och inte
smyga förbi. `CLAUDE.md`: *"Display preferences persist (they're settings, not a transient
filter); a URL that names them wins over these on load."* Lagringen är en nyckel per
inställning (`roadmap-group`, `roadmap-sort`, …) utan något vy-begrepp alls.

Förslaget till upplösning: **"inställning, inte filter" står kvar — men inställningen hör
till vyn den gjordes i.** Det är inte en transient sak som nollas vid navigering; den
minns, per vy. Det är en snävare ändring än den låter, och den bevarar bägge reglerna.

**Sparade vyer är redan så här, och det är den starkaste ledtråden.** `views[]` i
`board.config.json` bär alla åtta nycklarna, så en sparad vy sätter sin gruppering,
sortering och layout när man går in i den (`applySavedView` återställer allt). De
inbyggda vyerna — `all`, `ready`, `inbox`, `parents`, `standalone`, `attention` — är de
enda som saknar det. Frågan är alltså inte "ska display kunna vara per vy" utan "varför är
det bara hälften av vyerna som kan det".

**`collapsed` är det värsta fallet och värt att nämna för sig.** Nycklarna är
grupperingens egna värden, så en fällning gjord under `group=parent` i `All pucks` bär
över till en vy som grupperar på något annat — där matchar den ingenting, eller värre,
matchar `NO_VALUE`-hinken i en annan gruppering. `setDisplay` nollar den redan när
*grupperingen* byts, av exakt det skälet; navigering mellan vyer har ingen motsvarighet.

## Open questions

- **Vilka nycklar är per vy?** Gruppering, ordning, egenskaper och `collapsed` känns
  självklara. `layout` (bräda/lista) är tveksam — den är nästan en preferens om *enheten*
  snarare än om vyn, och att byta till lista i en vy och tillbaka till bräda i nästa kan
  bli rastlöst. Arkivväxeln (`done`) gäller redan bara i `ARCHIVABLE`-vyer, alltså finns
  där redan ett vy-beroende att bygga vidare på.
- **Vad gäller för en vy man aldrig ställt in?** Ärva den senaste (mjukt, men då är det
  fortfarande smittsamt första gången) eller tavlans standard (rent, men glömmer det man
  nyss valde när man går till en ny vy). Antagligen standard, med samma resonemang som
  `goToView` redan för om filtret.
- **Var lagras det?** En nyckel per vy och inställning blir många; ett objekt under
  `roadmap-display` med vyn som nyckel är en sak att migrera och en att läsa. Det senare,
  förmodligen — men det gamla formatet måste kunna läsas in en gång, annars tappar alla
  sin nuvarande inställning vid uppgraderingen.
- **Vinner länken fortfarande?** Ja, det måste den — en delad URL är hela produktens
  kontrakt. Men då finns tre nivåer i stället för två (URL > vyns minne > standard), och
  ordningen mellan dem ska stå skriven innan den byggs.
- **Räknas en *plats* som en vy?** `goToPlace` (repo, agent) sätter `focus = "all"` men är
  navigering på samma sätt. Om repo-vyer får eget minne blir det ett minne per repo, och
  det är förmodligen mer än någon bett om.
