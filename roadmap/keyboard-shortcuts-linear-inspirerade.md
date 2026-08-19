---
title: Keyboard shortcuts (Linear-inspirerade)
status: later
tags: [ui, editing]
updated: 2026-08-19
created: 2026-08-19
---

## Goal

Ge tavlan ett genomtänkt kortkommando-lager, i Linears anda — så power-users
navigerar och muterar pucker utan musen. Bygger vidare på ⌘K-paletten och den
befintliga pil/Enter/Escape-navigeringen som redan finns i sök/paletten.

## Research

- Referens (för mönster/vokabulär): <https://shortcuts.design/tools/toolspage-linear/>
- Redan på plats: `⌘K` öppnar command palette; pil upp/ner + Enter väljer; Escape
  stänger. Draghandtag för status; in-kolumn "+".
- Linear-vokabulär värt att härma (urval):
  - Enkeltangent-actions på en markerad puck: `S` status, `P` priority, `A`
    assignee/agent, `L` labels — mappar rakt mot puck-radernas fält.
  - `C` = create (öppna capture), `/` = fokusera sök, `G` sedan bokstav = gå till
    vy (`G` `I` inbox osv).
  - `X` markera, `Esc` avmarkera.

## Open questions

- Global lyssnare vs. bara när en puck är öppen? (Undvik krock med typing i fält.)
- Enkeltangent på markerad puck kräver ett "markerat kort"-tillstånd på tavlan
  (finns `selectedId` redan — bygg vidare på det?).
- Hur visas de? (Ett `?`-overlay som listar dem, Linear-style.)
- Mobil: irrelevant — det här är desktop-lager.
