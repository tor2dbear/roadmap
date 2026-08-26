---
title: "Dölj en kolumn — och has: som gör tomma-hinken sägbar"
status: now
tags: [ui, product]
updated: 2026-08-26
created: 2026-08-26
order: 5
---

## Goal
Ge kolumnhuvudet Linears `⋯` med *Hide column* — utan att införa ett andra ställe där
vy-tillstånd bor.

## Research
Frågan som startade det här var om `Show done & cancelled` och `Show empty columns`
skulle **bytas ut** mot per-kolumn-döljning. Svaret är nej, och koden är tydlig med
varför:

- **`Show done & cancelled` är ett objektfilter, inte en kolumnkontroll.** `viewTerms()`
  skjuter in `NOT_DONE` i frågan, så done-puckar försvinner i *alla sex* grupperingarna.
  En DONE-kolumn finns bara när man grupperar på status. Att byta reglaget mot "dölj
  DONE-kolumnen" hade lämnat kvar done-puckar i fem grupperingar av sex.
- **`Show empty columns` är en regel, inte ett urval.** Den utvärderas vid varje render
  och följer med när antalen ändras. En manuell dölj-lista blir fel i samma sekund som
  en dold kolumn får ett kort.

De är alltså inte samma sak som *Hide column*, och de tre kan samexistera.

**Det fanns redan ett ställe för tillståndet.** Filtret är en *frågesträng med negation*
(`-status:inbox`), inte en inklusionslista, och `toggleFilterValue(field, value, neg)`
fanns redan. En kolumn *är* ett värde av grupperingens fält — så att dölja en är en
negerad term i frågan vi redan har. Det ger serialisering till `?q=`, sparande i vyer,
och en väg tillbaka gratis: `chipsData()` renderar redan negerade termer som ett
borttagbart `Not Status: Later ×`. Det är bättre än Linears "2 projects hidden by
display options", för det *namnger* vad som är dolt.

**Ett hål i grammatiken.** Fyra kolumner har frånvaron av ett värde som nyckel —
`No priority`, `Unrouted`, `No etapp`, `No target`. Det finns ingen `-priority:x` som
namnger dem. Att räkna upp alla riktiga värden i stället (`priority:urgent,high,…`)
fungerar bara för en *sluten* mängd och går tyst fel för agenter och etapper, där ett
nytt värde skulle dyka upp redan dolt.

**Och en kolumn som inte går att namnge.** `target` grupperar på *månadshinkar* över ett
datum. Att namnge en hink kräver ett intervall — två termer — och att negera en
konjunktion är inget den här grammatiken kan säga.

## Delivered
- **`has:<fält>`** — frågar om pucken bär fältet alls. Symmetrisk med `is:`, negerbar,
  en rad i parsern och en gren i matchern. Det är så "dölj No priority-kolumnen" stavas,
  och det gör grammatiken mer komplett för agenter på köpet.
- **`⋯` på kolumnhuvudet** med *Show only this* och *Hide column*, i samma form som
  puckens `⋯`. Den visas bara där kolumnen faktiskt går att namna med en term — en
  target-månad får ingen, för en död menypost är sämre än ingen.
- **En regel i stället för fyra.** Första försöket jagade det per kolumn: "finns en
  negation som namnger mig, eller en positiv term som utelämnar mig, eller ett `has:`
  på mitt fält". Det var fyra regler som ändå missade korsparet — `-has:priority` tömmer
  varje *riktig* prioritetskolumn, och ingen regel om `priority:`-termer kan se det.
  Regeln som håller: **en tom kolumn är ett droppmål värt att behålla tills filtret
  uttalar sig om just det fält kolumnerna är gjorda av.** Då är den ett hål där en
  kolumn stod. `tag:ui` behåller alltså alla kolumner som mål; vilken term som helst på
  grupperingens eget fält tar bort de tömda. Uttalad i `groupsOf()`, som tavlan och
  listan delar, så den sägs en gång.
- **`eye` / `eye-off` (Feather)**, skalade till setets 15-rutnät.

## Verification
Körd i Chromium mot alla sex grupperingarna: dölj → kolumnen försvinner *med sitt
huvud*, `?q=` får termen, chipset dyker upp, och `×` på chipset tar tillbaka den.
`has:priority` för tomma-hinken, `-repo:roadmap` för repo, och target-månaden saknar
`⋯` medan `No target` har den. Listvyn följer med. Noll konsolfel, och
kontrastgranskningen är ren på tavlan, i menyn och på puckssidan i båda temana.

En bugg som riggen fångade och jag annars hade missat: *Show only this* lämnade först
kvar Now och Later som **tomma** kolumner, eftersom status bygger sina kolumner ur en
fast lista. Det var det som tvingade fram regeln ovan.

## Medvetet inte byggt
- **Ingen agent-dimension i filterpanelen.** Jag tänkte lägga till en, tills panelen
  visade sig säga rakt ut att *"Repo and agent are deliberately absent — they are the
  sidebar's places"*. Kolumnmenyn skriver `-agent:x` direkt till frågan, vilket är en
  annan dörr, inte samma. Panelens beslut står.
- **Reglagen står kvar.** Se Research.

## Open questions
- `Show only this` på en repo-kolumn skriver `repo:pia` till frågan, medan sidomenyns
  PIA-rad sätter samma sak som en *plats* (`state.repos`). Två mekanismer på samma fält.
  Ofarligt — det blir ett AND av samma villkor — men den positiva halvan skulle kanske
  gå via `goToPlace()` i stället, så sidoraden tänds. Negationen är däremot aldrig en
  plats: en plats är där man *är*.
