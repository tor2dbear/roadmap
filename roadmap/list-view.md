---
title: Listvy-läge (alternativ till kanban)
status: done
tags: [ui]
updated: 2026-08-16
order: 40
---

## Mål
Ett listläge som alternativ till kanban-brädet. Brädet tvingar horisontell swipe
mellan kolumnerna (NOW → NEXT → …) på mobil; en lista är en enda vertikal kolumn,
tätare rader, bättre överblick på telefon.

## Levererat
Toggle **☰/▦** i headern (val sparas i `localStorage`). Listläget grupperar per
status med rubriker, kompakta rader (repo-prick + titel + datum, repo-färgad
vänsterkant), tryck → samma modal. Läser samma filtrerade `items` som brädet, så
sök/filter/attention gäller likadant. `renderList()`/`listRow()` i `app.js`,
`.board.as-list` i `styles.css`. Sökförslag (`search-suggestions`) kan bygga
vidare på list-renderingen härnäst.

## Skiss
- Toggle i headern: **Bräda ⇄ Lista**. Val sparas i `localStorage`.
- Lista = kompakt rad per kort (titel + repo-prick + status-pill + datum),
  grupperad per status med rubriker. Tryck på rad → samma modal som idag.
- Läser samma filtrerade `items` som brädet — sök/filter/attention gäller likadant.

## Varför billigt
Data, filtrering och modal finns redan. Det är en andra render-funktion (~40–60 rader)
plus en toggle-knapp. Ingen ny datamodell.

## Synergi
En bra sökresultat-vy *är* i praktiken en listvy. Bygger vi list-renderingen en gång
kan sökförslag (`search-suggestions`) återanvända den. Värt att ta listvyn först och
bygga sökförslag ovanpå.

## Öppna frågor
- Gruppera per status eller per repo i listläget?
- Ska listan vara default på mobil och brädet på desktop, eller alltid användarens val?
