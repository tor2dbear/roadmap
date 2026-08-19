---
title: Keyboard shortcuts (Linear-inspirerade)
status: done
tags: [ui, editing]
updated: 2026-08-19
created: 2026-08-19
---

## Goal

Ge tavlan ett genomtänkt kortkommando-lager, i Linears anda — så power-users
navigerar och muterar pucker utan musen. Bygger vidare på ⌘K-paletten och den
befintliga pil/Enter/Escape-navigeringen som redan finns i sök/paletten.

## Delivered (v1)

Ett globalt keydown-lager med gating (triggar aldrig medan man skriver i ett
fält, eller när en modal/⌘K äger tangentbordet):

- **Globalt:** `C` = capture (öppna New) · `/` = sök/palett · `⌘K`/`Ctrl-K` =
  palett · `G` sedan bokstav = gå till vy (`A` all, `R` ready, `I` inbox,
  `T` needs attention) · `?` = hjälp-overlay.
- **När en puck är öppen:** `S` status · `P` priority · `A` agent · `L` labels —
  öppnar respektive prop-picker. Mappar rakt mot puck-radernas fält (`data-field`).
- **`Esc`** nystar upp ett lager i taget: hjälp → palett → detalj.
- **`?`-overlay** listar alla kommandon; även nåbar via ⌘K → "Keyboard shortcuts".

Referens som styrde vokabulären: <https://shortcuts.design/tools/toolspage-linear/>.

## Medvetet ej byggt (v2-spår)

Kräver ett "markerat kort"-tillstånd på själva tavlan (inte bara i detaljvyn):

- `J`/`K` för att flytta markering mellan kort, `Enter` för att öppna.
- `X` markera/multiselect + bulk-actions (status/priority på flera i taget).
- Enkeltangent-actions (`S`/`P`/`A`/`L`) direkt på ett markerat kort på tavlan,
  inte bara när pucken är öppen.

Filas som en separat förbättring — v1 täcker navigering + snabb mutation av en
öppen puck, vilket är 80/20:t.
