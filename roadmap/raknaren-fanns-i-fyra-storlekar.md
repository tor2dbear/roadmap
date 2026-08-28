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
räknas:

| | siffrans höjd | i CSS-px |
|---|---|---|
| `27` bredvid *All pucks* | 24 devpx | ~8,0 |
| `3` bredvid NOW | 26 devpx | ~8,7 |

Kvoten 24/26 = 0,92 matchar 11/12 = 0,917, och koden bekräftar det. Samma märke —
samma typsnitt, samma `--ink-3`, samma `tabular-nums` — i fyra storlekar:

| Märket | Var | Storlek |
|---|---|---|
| `.view-count` | *All pucks* **27** | `--fs-sm` 11px |
| `.focus-n` | sidomenyns vyrader | `--fs-sm` 11px |
| `.col-head .count` | NOW **3** | `--fs-base` 12px |
| `.list-head .count` | listlägets rubriker | `--fs-base` 12px |
| `.hidden-col .count` | HIDDEN-facket | ärvde 13px |

**Det som avgör att det är drift och inte en regel:** man kan efterhandskonstruera
"siffran står ett steg under sin etikett", men kolumnrubriken `NOW` och sidomenyns
vyrad är *båda* `--fs-md` 13px — och deras siffror var ändå 12 respektive 11. Identisk
etikettstorlek, identiskt märke, två svar. Den största rubriken på sidan, vytiteln på
14px, bar den minsta siffran.

Båda reglerna kom dessutom ur samma commit: `d0fa5f4`, *"Etapper i gränssnittet, ett
komponentspråk…"* — den som skulle ena språket lämnade märket i två storlekar.

## Plan
En storlek: `--fs-base`. Skalan namnger den själv i sin egen kommentar —
`--fs-base: 12px; /* dense chrome: small buttons, chips, counts, field labels */`.
Det är `.view-count` och `.focus-n` som gått ifrån den, och `.hidden-col .count` som
aldrig valde alls utan ärvde.

Två märken ska *inte* med:

- **`.filter-count`** (10px, orange pilla på Filter-knappen) räknar **filter, inte
  kort**. Annat märke, annan form, legitimt annan storlek.
- Ingenting annat. Regeln fick inget undantag, se nedan.

## Notes
Undantaget jag först skrev in var fel, och sättet det föll på är värt att spara.

`.focus-n` sitter i en `.row`, som är `--fs-md` i popovern och `--fs-xl` i arket. Att
storleksätta den i `em` ser därför riktigt ut, och ikonen bredvid verkar sätta
precedens: `.focus-icn` ber om `1.15em`. Jag skrev `.92em`, och en kommentar som
hänvisade till ikonen.

Ikonen skalar inte. `.pick-menu .row > .icn` pinnar den till 15px i menyn och slår
`1.15em` på specificitet — mätt: 14,94px i sidomenyn (där `em` vinner), 15px i arket
(där den inte gör det). En `em`-räknare hade alltså vuxit till 13,8px förbi ett märke
som stod kvar, på precis den yta en tumme läser dem bredvid varandra.

Regeln blev enklare av att undantaget föll: en storlek, inget undantag.

Fyra sabotage, alla biter, och testet säger vilken storlek det såg:

| Sabotage | Faller på |
|---|---|
| `.view-count` tillbaka till 11px | `["12px","11px"]` |
| `.focus-n` tillbaka till 11px | `["11px","12px"]` + arkkontrollen |
| tray-räknaren ärver igen | `["12px","13px"]` |
| den rimliga-men-fel `em`-fixen | `["11.96px","12px"]` + arkkontrollen |

Täckningen frågar en selektor i taget i stället för ett kommaskarvat svep: tre av de
fem delar klassen `count`, så ett enda svep kan inte skilja dem åt — och en selektor
som tyst slutat matcha hade låtit resten passera. Verifierat genom att peka en av dem
på en klass som inte finns.
