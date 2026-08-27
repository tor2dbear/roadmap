---
title: "En sak, en plats: facket äger kolumnerna, chipparaden korten"
status: done
tags: [ui, product]
updated: 2026-08-27
created: 2026-08-27
parent: gui-hantverk
---

## Goal
Kort försvann från brädan på tre vägar och brädan förklarade varje väg olika: ibland
ett chip, ibland `HIDDEN`-facket, ibland båda — och för Display-växeln
**Show done & cancelled** ingenting alls. Den vanligaste vägen var den som sa minst.

## Regeln

> **En hel kolumn som saknas → facket. Kort som saknas inuti kolumnerna → chipparaden.**

- **Facket svarar för båda orsakerna.** Arkivväxeln är inget frågeterm — den ligger i
  `viewTerms()` som `-is:done`, osynlig även för chipparaden — så `hiddenColumns` frågar
  brädan två gånger (`wouldShow(g, false)` respektive `true`) för att skilja en kolumn som
  frågan gömde från en som växeln gömde. Varje rads öga gör rätt lagning, och en kolumn
  gömd av *båda* kommer tillbaka på ett klick.
- **Antalen följer samma delning.** En frågegömd kolumn räknas med arkivet som det står,
  en arkivgömd med det lyft — annars skulle ett gömt repo skylta med sina landade puckar
  som väntande.
- **Ett chip står tillbaka bara för den exakta dubbleringen** — ett term som inte är något
  annat än "göm de här kolumnerna", i den polaritet som gömmer. Ett positivt term
  (`Status: Now, Next, Later`) är omfånget du valde, inte en kolumn du gömde.
- **List-layouten har inget fack**, så där är allt chip.

## Vad som föll ut på vägen

Fem granskningsfynd, varav tre var buggar som fanns på `main` sedan tidigare:

- Ett öga som inte skulle ge något är sämre än ingen rad (tom kolumn med `empty=0`).
- Att gömma en kolumn vräkte varenda *annan* tom kolumn med sig — `groupsOf` frågade om
  frågan nämnde grupperingens *fält*, inte om den talade emot just den kolumnen.
- Ögat letade efter kolumnens namn i en fråga som stavat det annorlunda. `repo:` godtar
  tre stavningar, `parent:` tre. `valueNamesColumn` frågar datat samma sak som matchningen.
- Ett term kan stava samma kolumn två gånger — ta bort båda.
- En kolumn arkivet gömde behöver inget namn för att komma tillbaka; kravet slog ut
  Target-grupperingen, där en månad är ett intervall och inte går att namnge med ett term.

Dessutom: chipparaden följde med in på pucksidan, och kolumnmenyn hängde under sidomenyn
vid första kolumnen och utanför fönstret vid sista. `fitPop` mäter i stället för att gissa.

## Öppet, medvetet

Under en **icke-status-gruppering** tar arkivet *kort* i stället för kolumner, och där är
det fortfarande tyst: `?group=repo` med arkivet av visar PIA:s 6 öppna puckar och tappar
39 landade, utan chip och utan fackrad. Att täppa till det betyder att ge arkivet ett eget
chip — en fjärde plats för en och samma växel. Beslut: nej. Rubrikens antal (38 mot 140)
får vara signalen. Står namngivet i `CLAUDE.md`.
