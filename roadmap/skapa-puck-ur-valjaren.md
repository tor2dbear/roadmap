---
title: "Skapa en puck ur väljaren"
status: next
tags: [ui, dx]
updated: 2026-08-21
created: 2026-08-21
order: 15
depends: [ui-overlay-och-pickers]
---

## Goal
Kunna skapa en puck direkt ur en referensväljare — "Ny etapp «Auth»" — utan att
först lämna det man höll på med.

## Research
Det starkaste mönstret i referensapparna (Notion/ClickUp) är **sök och skapa i samma
fält**: skriver du något som inte finns dyker "Ny «X» i *Resurser*" upp överst, och
måldatabasen är utskriven.

Det passar vår modell ovanligt bra, eftersom en etapp *är* en puck:
"skapa etapp" = "skapa puck + sätt `parent`". Idag är det två separata steg i olika
delar av GUI:t — ＋ Ny puck, sedan öppna den, sedan sätta Etapp.

`ui-overlay-och-pickers` byggde halva vägen: labels har redan "Create #ny-label",
och den öppna/slutna-regeln säger att pucks *får* skapas ur en väljare (till skillnad
från status och priority). Det som återstår är att skapandet inte är gratis här.

### Varför det inte bara är en rad till
En ny label är en sträng i frontmatter. En ny puck är:

1. **En fil i ett repo** — permanent. Repot är flödets enda irreversibla val, och
   `createPuck()` kräver det redan av just det skälet. Raden måste alltså namnge
   repot: *"Ny etapp «Auth» i **Etapp**"* — precis som referensappen skriver ut
   "i Resurser", fast hos oss av tyngre skäl.
2. **Ett commit.** Att skapa och sedan sätta `parent` är två skrivningar mot två
   filer; de kan halvfela. Antingen accepterar vi det (och rullar tillbaka den första
   om den andra misslyckas), eller så skapas pucken med `parent:` redan i mallen —
   vilket är en skrivning och därmed bättre.
3. **En titel, inte en slug.** Väljaren söker på titel; `slugify()` ger filnamnet.
   Det man skriver blir alltså titeln, och slugen visas som förhandsvisning
   (`np-preview` gör redan det i ＋ Ny puck).

### Snitt
- Raden syns bara när sökningen inte matchar något, och bara i väljare vars mängd är
  öppen (`Etapp`, `Blocked by`).
- Repo: puckens eget repo som förval, med möjlighet att välja annat. Cross-repo-fallet
  är ovanligt nog att inte behöva ligga i vägen.
- Skapandet går via `createPuck()` med `parent`/`depends` förskrivet i mallen, så det
  blir **ett** commit.
- Optimistisk render som allt annat: pucken finns på tavlan direkt, rullas tillbaka
  om commiten faller.

## Open questions
- Ska den nya pucken öppnas efteråt, eller ska man stanna kvar i pucken man kom från?
  (Förslag: stanna kvar — man var mitt i något annat. En toast med länk räcker.)
- `Blocked by` med — eller bara `Etapp` först? Blockeraren man saknar är oftare
  arbete som *inte* är formulerat än en etapp är.
