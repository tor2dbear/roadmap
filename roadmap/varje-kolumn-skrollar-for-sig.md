---
title: Varje kolumn skrollar för sig
status: inbox
tags: [ui]
updated: 2026-09-12
created: 2026-09-12
priority: medium
owner: tor2dbear
---

## Goal

I kanban ska **varje kolumn vara sin egen lodräta scrollruta** och ytterlådan bara skrolla
i sidled — Linears form, rapporterad därifrån med skärmdump. Rubriken pinnas då inte: den
ligger *utanför* lådan som skrollar, vilket är ett annat svar än `.col-head { position:
sticky }` och ett billigare.

Det är efterföljaren till `bradans-egen-scrollruta`, som gav brädan en port. Den här frågar
vad porten ska vara *till för*.

## Research

Prototypad mot repots egen datasnapshot (117 pucker, fyra banor) och mätt i två format.
Fem deklarationer räcker, och DOM:en har redan rätt form — `.column` > `.col-head` +
`.cards`:

```css
.work > .port:has(> .board:not(.as-list))   { overflow-y: hidden; }
.port > .board:not(.as-list)                { flex: 1; min-height: 0; padding-bottom: 0; }
.port > .board:not(.as-list) > .column      { display: flex; flex-direction: column; min-height: 0; }
.port > .board:not(.as-list) > .column > .cards    { overflow-y: auto; min-height: 0; flex: 1; }
.port > .board:not(.as-list) > .column > .col-head { position: static; }
```

`flex: 1; min-height: 0` på brädan är den rad som inte är uppenbar: utan den står brädan på
sin innehållshöjd (1833px i en 731px port), kolumnerna får ingen bestämd höjd och `.cards`
har inget att skrolla inom. Mätt i första försöket — porten skrollade fortfarande lodrätt
och ingenting hade ändrats.

**Mätt, 390×844:**

```
                         före                efter
porten skrollar          x + y               x
brädans höjd             1873                618  (portens höjd minus foten)
kolumnrubrik vid scroll  pinnad mot 0        står kvar på 18
Later (15 kort)          följer brädan       egen ruta, plats 300 medan grannarna står
foten                    y=1986, skrollar    y=731, permanent
```

**Tre buggar försvinner för att deras orsak försvinner:**

- **Skugg-kanten** (`margin-inline: -8px` på `.col-head`) finns bara för att rubriken målas
  *över* ett bortskrollat kort och måste täcka dess `0 2px 8px`. Ingen överlappning, ingen
  skugga att täcka.
- **18px-bandet som tillhörde ingen.** En sticky-box fäster mot portens innehållsbox; utan
  sticky finns frågan inte.
- **`Now försvinner upp`** — en kort kolumn som tog sin rubrik med sig ut ur rutan. Med
  varje kolumn i radens höjd är det strukturellt omöjligt, och `align-items: stretch` blir
  en konsekvens i stället för en lagning.

**Och facket, som var en egen rapport.** *"Hidden hamnar lite off"* — facket är en `.column`
med `align-self: start` och `position: static` rubrik, så det glider upp ur rutan när man
skrollar. Mätt före: `huvudY -289` vid scroll 300. Efter: `11`, oförändrat. Det behöver inte
pinnas, för det finns ingen lodrät resa att glida i.

**Priset är foten, och det är ett beslut som redan fattats en gång.** Med ytterlådan
enaxlig finns ingen lodrät resa utanför en kolumn, så foten har ingenstans att skrolla bort
till. Mätt: **114px permanent på 390×844** (13% av fönstret), 65px på 1400×900. Det är exakt
det som rapporterades som fel i `bradans-egen-scrollruta` — *"Nu ligger footern sticky i
botten. Det vill jag inte"* — den gången 114 av 844. Linear har ingen fot; vi har
skördetiden, `sync now` och tre länkar.

En tunn fot provades i prototypen (`flex-wrap: nowrap`, länkarna dolda) och mätte 62px, men
den radbryts fortfarande och lämnar lösa `·` efter sig. En enradig fot är eget arbete i
markupen, inte en CSS-rad.

## Open questions

- **Vad händer med foten?** Tre vägar, ingen av dem gratis: (a) permanent och tunnare —
  kräver att raden görs om, inte bara trycks ihop; (b) tidsstämpeln flyttar (`Sync now`
  finns redan i ⌘K, tiden finns ingen annanstans); (c) formen tas bara på desktop, där
  foten är 65px och inte radbryts — men en layout som skiljer sig mellan format är två
  layouter att underhålla. **Den här frågan avgör hela pucken.**
- **Platsen blir N tal i stället för ett.** `openDetail` sparar en offset och `closeDetail`
  lägger tillbaka den; med sju kolumner som var och en minns sitt läge, och `renderBoard`
  som byter ut brädan, är det sju. `scrollPort()` svarar med *en* låda — vad svarar den här?
- **Hjulet över krommet tappar sin lodräta halva.** Regeln *"krommet ovanför porten är ingen
  död zon"* forwardar `deltaY` till porten. Pekaren står över topbaren, inte över en kolumn,
  så det finns ingen kolumn att skicka den till.
- **Dra kort mellan kolumner** ska autoskrolla två nästlade lådor i stället för en. Bara en
  desktopfråga — HTML5-dnd finns inte på iOS touch alls.
- **Scrollindikatorerna**, som `bradans-egen-scrollruta` lämnade öppna: varje låda blir
  enaxlig här, så den frågan kan lösas upp av sig själv i stället för att besvaras.
