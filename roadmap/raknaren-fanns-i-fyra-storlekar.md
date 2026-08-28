---
title: Räknaren fanns i fyra storlekar
status: done
tags: [ui]
updated: 2026-08-28
created: 2026-08-28
---

## Goal
"Hur många kort ligger bakom den här etiketten" är en mening. Den ska ritas i en
storlek, överallt där den står.

## Research
Rapporterat från telefonen, med tre ringar i rött runt siffrorna: `All pucks 27`,
`NOW 3`, `NEXT 5`. Frågan var enkel — finns det någon anledning att de har olika
storlek?

Mätt i skärmbilden, med den röda pennan bortfiltrerad på färgmättnad så bara bläcket
räknas: `27` är 24 devpx bläck, `3` är 26. Kvoten 0,92 matchar 11/12 = 0,917, och koden
bekräftade det. Samma märke — samma typsnitt, samma `--ink-3`, samma `tabular-nums` — i
fyra storlekar över **sex** ställen:

| Märket | Var | Var det stod |
|---|---|---|
| `.view-count` | *All pucks* **27** | 11px |
| `.focus-n` | sidomenyns vyrader | 11px |
| `.chip .n` | sidomenyns repo- och agentrader | 11px |
| `.col-head .count` | NOW **3** | 12px |
| `.list-head .count` | listlägets rubriker | 12px |
| `.hidden-col .count` | HIDDEN-facket | ärvde 13px |

**Det som avgör att det är drift och inte en regel:** man kan efterhandskonstruera
"siffran står ett steg under sin etikett", men kolumnrubriken `NOW` och sidomenyns
vyrad är *båda* `--fs-md` 13px — och deras siffror var ändå 12 respektive 11. Identisk
etikettstorlek, identiskt märke, två svar. Den största rubriken på sidan, vytiteln på
14px, bar den minsta siffran.

Båda reglerna kom ur samma commit: `d0fa5f4`, *"Etapper i gränssnittet, ett
komponentspråk…"* — den som skulle ena språket lämnade märket i två storlekar.

## Plan
En storlek: `--fs-sm` 11px, som skalan nu namnger åt räknare.

`.filter-count` står utanför och ska göra det — den räknar **filter, inte kort**, och är
en fylld pilla snarare än ett märke bredvid en etikett.

## Notes
**Jag valde först 12px och fick rätta mig.** Motiveringen var att skalans egen kommentar
namngav `--fs-base` åt räknare — men jag hade missat ett märke när jag skrev den listan.
Repo- och agentraderna använder klassen `.chip .n`, inte `.count` eller `.focus-n`, och
de är den **längsta** listan av räknare på brädan. Att ena uppåt flyttade alltså
majoriteten för att matcha minoriteten. Rapporterat med ögat, från telefonen, så fort de
andra fem hade flyttat sig: *"count för repon ser fortfarande ut att skilja sig — men
tror jag gillar den mindre storleken faktiskt."* Mätt i den skärmbilden: 25–27 devpx mot
23.

**Det verkliga felet var inte storleken, det var testet.** Första versionen räknade upp
fem selektorer och gick igenom grön medan den sjätte satt osedd bredvid. En handhållen
lista över vad som ska kontrolleras är ett andra ställe att komma ihåg, och det är det
som glöms.

Svepet frågar nu DOM:en i stället: varje löv vars hela text är siffror och vars snitt är
monon, över fem brädor (facket behöver en gömd kolumn, `.list-head` behöver listläget,
reporaderna behöver sidomenyn). 67 märken. Ett sjunde märke kan inte gömma sig för det.

Ett undantag jag först skrev in var också fel, och hur det föll är värt att spara.
`.focus-n` sitter i en `.row` som är `--fs-md` i popovern och `--fs-xl` i arket, så `em`
ser riktigt ut, och ikonen bredvid verkar sätta precedens med sin `1.15em`. Ikonen
skalar inte: `.pick-menu .row > .icn` pinnar den till 15px i menyn och vinner på
specificitet — mätt 14,94px i sidomenyn, 15px i arket.

Fyra sabotage, alla biter, och testet säger vilka storlekar det såg:

| Sabotage | Faller på |
|---|---|
| `.chip .n` tillbaka (det du såg) | `["11px","12px"]` |
| kolumnräknaren till 12 | `["11px","12px"]` |
| vytitelns räknare till 12 | `["11px","12px"]` |
| `.side-repos` får tillbaka sin override | `["11px","13px"]` |

Den första är den som det gamla testet omöjligt kunde fånga.
