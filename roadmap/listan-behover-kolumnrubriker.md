---
title: Listan behöver kolumnrubriker
status: inbox
tags: [ui]
updated: 2026-09-16
created: 2026-09-16
priority: low
owner: tor2dbear
---

## Goal

**Ingenting i listan säger vad en kolumn är.** Rapporterat från en telefon med Linear
bredvid, tillsammans med de tomma märkena — och det var två rapporter i en. Märkena fick
sin egen form i `tomma-egenskaper-syns-och-satts-dar-de-syns`; det här är den andra halvan,
och den handlar inte om tomrum alls.

En **ifylld** prioritetscell är precis lika onamngiven som en tom: tre staplar, ett
agentchip, en ägaravatar och ett `◷`-datum säger ingenting om vilken kolumn de står i. Att
ge de tomma cellerna en form gjorde dem läsbara som *sorter*, inte som kolumner. Referensen
har `Name · Health · Priority · Lead · Target date · Iss…` överst och behöver därför inga
former alls — den har bägge, vi har en.

## Research

**Spåren finns redan som en variabel.** `applyListTracks()` sätter `--list-tracks` på
listan ur samma vandring över `PROPS` som bygger cellerna, så en rubrikrad som ärver samma
grid-template är gratis att hålla i register — den får inte ha en egen kopia av spåren,
vilket är precis felet `--list-fixed` kommentaren varnar för ("a track widened in one place
and not the other").

**Den måste pinnas i sidled.** Raden scrollar horisontellt, och en rubrik som inte följer
med är värre än ingen. Grupprubriken (`.lh-inner`) löser exakt det redan:
`position: sticky; left` på sitt viloläge, inte på `0` — se *a pinned box pins where it
already sits*. Vertikalt är den en andra sticky-låda i samma skrollruta som
`.list-head`, vilket filen redan beskriver som "two sticky boxes, one axis each, nested".

**Priset är en permanent rad.** På 390×844 är en rad ~38px, alltså drygt 4% av fönstret,
och den kan inte scrollas bort om den pinnas vertikalt. Det är den verkliga invändningen,
och den är starkast på just den skärm där rubrikerna hjälper mest.

## Open questions

- **En rad överst, eller namn i cellerna?** Referensen har rubrikrad. Ett alternativ som
  kostar noll vertikalt är att låta varje cell bära sitt namn som `title`/`aria-label` —
  men hover finns inte på en telefon, och telefonen är fallet. Ett tredje: rubriker bara
  i listan på breda skärmar (`@container`), där raden kostar minst och kolumnerna ändå är
  flest.
- **Vad heter kolumnerna?** `PROPS[].label` finns (`Priority`, `Agent`, `Owner`, `Repo`,
  `Labels`) och används redan i Display-menyn. Datumspåret är det enda som inte har ett
  namn utan tre (`dateFields()`), så rubriken där är antingen "Dates" eller fältets namn
  när bara ett visas.
- **Ska rubriken vara en kontroll?** Linear sorterar på klick i rubriken. Vi har en hel
  ordningskedja i Display-menyn, så en rubrik som *också* sorterar är ett andra ställe som
  säger samma sak — och den kan inte visa en kedja. Troligen: rubriken namnger, den styr
  inte.
- **Glyfkolumnen och namnkolumnen har inga namn**, och ska inte ha. En rubrik över
  pucksymbolen namnger ingenting.
