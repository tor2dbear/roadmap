---
title: Vyn väljer sina egenskaper
status: next
tags: [ui, product]
updated: 2026-09-04
created: 2026-09-04
priority: high
target: 2026-09-30
owner: tor2dbear
agent: design
---

## Goal

Välja **vilka egenskaper som visas** — status, prioritet, agent, repo, ägare, skapad,
uppdaterad, target, etiketter, rollup — på korten och raderna *och i gruppernas
rubriker*, och att valet är en del av vyn: det ligger i URL:en, följer med en delad
länk och sparas med en sparad vy.

## Research

**Uppsättningen finns redan; det som saknas är valet.** Både kortet och listraden ritar
en fast uppsättning fält, och varje fält är redan sin egen vaktade rad — `if
(item.priority)`, `if (item.agent)`, `if (item.owner)`, `if (item.progress)`. Det är
alltså inte en omskrivning av renderarna utan en fråga till dem: *är det här fältet
påslaget i vyn?*

- **Listraden** är ett rutnät med fasta spår: `18px | namn | prioritet | agent | repo |
  datum`. Att stänga av ett fält är att ta bort både cellen och dess spår, annars står
  en tom kolumn kvar och håller sin bredd.
- **Kortet** lägger sina märken i en rad (`card-meta`) och behöver bara sluta lägga dit
  dem.
- **Gruppens rubrik hör hit lika mycket som raden.** Den bär två tal — `count`
  (antalet rader gruppen visar) och rollup-brickan (`progress`, delarna pucken *har*) —
  plus arkivmärket och swatchen. Rubriken är samma fråga en nivå upp.
- **Datumet är redan ett val, fast automatiskt.** `cardDateField()` väljer fält efter
  hur man sorterat: sorterar man på `created` visas `created`, på `target` visas
  `target`, annars `updated`. Regeln finns för att en lista som sorterats på ett datum
  och visat ett annat läste som blandad. Ett handval måste antingen ersätta den regeln
  eller ligga ovanpå den — och det är den enda riktiga designfrågan i pucken, inte det
  mekaniska.

**Var det bor är redan bestämt av två existerande beslut.**

1. **`VIEW_KEYS`** i `app.js` är de åtta nycklar en vy består av
   (`view, q, group, layout, sort, done, empty, collapsed`), samma nycklar i URL:en som
   i `views[]` i `board.config.json`. En nionde (`fields`) ärver därmed delbara länkar
   och sparade vyer gratis. `effectiveParams()` är den enda normaliseraren och är där
   ett fält som inte kan betyda något i den aktuella layouten ska falla bort — precis
   som `empty` gör utanför tavlan och `collapsed` utanför listan.
2. **Display-menyn** är redan hemmet för "hur mycket visas": layout, gruppering,
   ordning, `Show done & cancelled`, `Show empty columns`. En rad till, med en
   undermeny av kryssrutor, är den formen menyn redan har (`DISPLAY_FIELDS` →
   `renderDisplayValues`).

**Det finns redan ett automatiskt val att inte bryta** — och det är avgjort tvärtemot
hur den här texten först löd. Se *Beslut* nedan.

## De två talen i rubriken säger olika saker, utom när de inte gör det

`count` är **hur många rader gruppen visar just nu**; rollup-brickan är **hur många
delar pucken har**, ofiltrerat. Utan filter är de samma tal, och det är exakt då de ser
ut som en dubblering: `Brand it + split product / instance 2 ⚬2/2`. Med ett filter går
de isär, och då är bägge värdefulla.

Det gör dem till ett bra första par att kunna välja mellan — och det är samma
resonemang som redan avgjorde att *raden* inte bär någon räknare: `progress` svarar på
den stadigare frågan, medan ett antal rör sig med filtret. Skillnaden är att rubriken
har plats för bägge, så där är det ett val och inte ett avgörande.

## Vad som gör den värd hög prio

Tavlan har fått fler egenskaper än en rad rymmer: prioritet, agent, ägare, target,
rollup, blockerare, flaggor, etiketter. På 390px trängs de redan om titeln — det var
precis vad `1 archived part`-märket gjorde med `Nästling…` i nästlingsarbetet, och
lösningen där var att flytta *en* sak till en egen rad. Det är en lokal räddning av ett
generellt problem: uppsättningen är inte densamma för en fleet-vy som för en
prioriteringsgenomgång.

## Beslut

**Automatik gäller i frånvaro av ett val, aldrig över ett.** Det är den ena regeln
bägge besluten nedan följer, och den finns för att en tyst överkörning är samma fel
filen redan namnger två gånger: en kontroll som påstår ett val som aldrig trädde i kraft.

**Datumet: valet ersätter `cardDateField()`.** `Created`, `Updated` och `Target` blir
tre separata val, och dagens regel — visa det datum sorteringen handlar om — blir
*defaultuppsättningen* när inget datum är valt. Kollisionen som tvingade fram frågan:
sorterar du på "Newest created" och har kryssat `Updated` visar raderna
uppdateringsdatum medan ordningen följer skapandedatum, vilket läser som en oordnad
lista — precis felet regeln skrevs för att förhindra. Med valet som överordnat kan du
kryssa i bägge och se varför ordningen är som den är.

**Bredden: raden får scrolla i sidled i stället för att tappa kolumner.** Mätt på 390px
med hela uppsättningen påslagen: sidbredden står stilla (390), lådan scrollar internt
(926), och med `position: sticky; left: 0` på glyf + namn står titeln kvar efter 260px
sidled, oklippt. Rubriken måste frysas i sidled på samma sätt, annars scrollar den ut
åt vänster.

Priset är **en** sak, och bara en: `overflow-x: auto` gör lådan till scrollcontainer i
båda axlarna, så gruppubrikens `top: sticky` upphör att gälla. Den kostnaden var i
första bedömningen felprissatt som ett skalbygge — slutsatsen "alltså måste sidans
scroll flytta in i en ruta" förutsätter att den klibbiga rubriken är värd priset, och
Notion har den inte på telefon. Skalbygget står kvar som en möjlighet om rubriken visar
sig saknas, och hör då ihop med `headern-malas-inte-vid-omladdning`, som rör samma
geometri.

Vinsten utöver löftet: **hela brytpunktsräkningen kan gå.** 560/720, sedan 652/812 när
indraget skulle in — två buggar på två dagar kom ur de talen. En rad som får scrolla
behöver ingen veta vad som får plats.

## Open questions

- **Får gruppens rubrik sluta följa med nedåt?** Det är hela priset för sidledsscrollen,
  och det är ett smakbeslut som inte går att mäta fram: Notion lever utan den på telefon.
  Ja → en handfull CSS-rader. Nej → listan måste bli sin egen scrollruta, vilket rör
  iOS-scroll, footern och samma geometri som `headern-malas-inte-vid-omladdning`.
- **Ett val eller ett per layout?** Listan har spår, kortet har märken; samma
  uppsättning i bägge är enklare att förklara och sämre för bägge. `effectiveParams`
  kan bära det, men två uppsättningar är två saker att spara.
- **Delar rubriken radens uppsättning?** De har bara `rollup` gemensamt, och rubrikens
  `count` finns inte på raden alls — så en gemensam lista blir en lista med rader som
  inte gäller överallt. Två små uppsättningar är förmodligen ärligare än en stor med
  undantag.
- **Vad kan aldrig stängas av?** Titeln, uppenbart. Puck-glyfen bär repofärgen, och
  varningsmärket är driftsignalen — att kunna dölja den är att kunna dölja att något är
  fel.
- **Räknas det som filter eller som display?** Det är display (chipparaden talar om
  filter), men gränsen är värd att skriva ner: `is:flagged` gömmer kort, `-flagged`
  skulle gömma ett märke.
