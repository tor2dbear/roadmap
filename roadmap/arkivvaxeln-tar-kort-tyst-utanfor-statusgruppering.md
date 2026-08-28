---
title: Arkivväxeln tar kort tyst utanför statusgruppering
status: next
tags: [ui]
updated: 2026-08-28
created: 2026-08-28
---

## Goal
Regeln i CLAUDE.md säger: *en hel kolumn som saknas → `HIDDEN`-facket; kort som saknas
inuti kolumnerna → chipraden.* Arkivväxeln lyder den bara under statusgruppering. Under
alla andra grupperingar tar den kort utan att något på skärmen säger det.

## Research
Mätt mot testfixturen, `?group=repo`:

| | kort | kolumner | chips | fack |
|---|---|---|---|---|
| arkiv **av** | 7 | Alpha, Beta, Hidden | — | Landed |
| arkiv **på** | 11 | Alpha, Beta, Landed | — | — |

Fyra kort försvinner ur Alpha och Beta utan chip och utan fackrad. Facket fångar bara
`Landed`, för ett repo hamnar där först när *varje* puck i det är arkiverad.

Under statusgruppering finns problemet inte: `Done` och `Cancelled` är hela kolumner, så
facket får sina rader (`Done`, `Cancelled`) och regeln håller.

På skarp data är skillnaden större än i fixturen. `?group=repo` med arkivet av visar PIA:s
6 öppna puckar och döljer 39 landade — utan ett ord.

**Varför det ser ut som det gör.** Växeln är inte ett frågeterm. Den bor i `viewTerms()`
som `-is:done`, alltså utanför `state.query`, och chipraden ritas ur `chipsData()` som
läser just `state.query`. Chipraden kan därför inte se den. Det är medvetet — annars hade
den mest använda växeln fått ett chip man tvingas stänga av hela tiden — och det är också
exakt varför den blir osynlig när facket inte täcker den.

## Open questions
Att stänga luckan betyder att arkivet får ett eget chip. Då förklaras samma växel på
**fyra** ställen: Display-menyn, facket, chipraden och kolumnens `⋯`. Det är avvägningen,
och den är ett produktbeslut snarare än en buggfix — vilket är varför den stod öppen i
dokumentationen i stället för att fixas halvvägs.

Alternativ som inte kräver ett fjärde ställe:

- **En fackrad även under andra grupperingar.** Facket är kolumnformat och rymmer i dag
  bara hela kolumner; en rad som säger *"39 arkiverade kort, spridda"* bryter dess form.
- **En rad i kolumnhuvudet** — `PIA 6 · 39 arkiverade`. Säger det där kortet saknas,
  utan en ny yta, men lägger brus i varje kolumnhuvud.
- **Lämna det.** Då ska meningen i CLAUDE.md skrivas om så den inte lovar ett chip som
  ingen kod skriver.

## Notes
Föregick fackarbetet i #21 och ändrades inte av det. Skriven nu, inte då, eftersom regeln
om vad som förtjänar en puck (`CONVENTION.md`) säger att en lucka man hittar men inte
lagar är precis det som ska ligga på brädan — och den här låg bara i en kodkommentar.
