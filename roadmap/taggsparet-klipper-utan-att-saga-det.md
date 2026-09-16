---
title: Taggspåret klipper utan att säga det
status: done
tags: [ui]
updated: 2026-09-16
created: 2026-09-16
priority: medium
owner: tor2dbear
---

## Goal

**61 av 109 rader får sina etiketter avskurna på en telefon, utan att något säger att det
finns mer.** Rapporterat från en telefon: *"sista kolumnen med taggarna klipps"*. Mätt vid
390px under `group=none` mot den riktiga datan — värsta fallet är
`#collab #permissions #supabase`, 215px innehåll i en **80px** cell, med sista pillret
135px utanför kanten och `overflow: hidden` som sax.

## Research

**Orsaken är en rad, och den har aldrig fungerat som den ser ut.**

```js
var LIST_TAGS_TRACK = "minmax(80px, 160px)";
```

Ett `minmax`-spår når sitt tak bara när rutnätet har ledigt utrymme. Raden är ett eget grid
med `min-width: calc(var(--list-fixed) + 220px)`, där `--list-fixed` summerar taggspåret
till sitt **golv** (`px += 80`) — så på varje skärm som är smalare än summan finns per
definition inget ledigt utrymme, och spåret står på 80px. Taket har aldrig gällt där det
behövdes. Från 7 sep (`Vyn väljer sina egenskaper`), alltså inte något de tomma märkena
införde.

**Och klämningen köper ingenting.** Raden scrollar redan i sidled — det är hela poängen med
`min-width` — så en bredare kolumn kostar scrollsträcka, inte läsbarhet. Varje annat spår
är en fast pixelbredd; taggarna är det enda som ger med sig, och det enda som inte har
något att vinna på det.

**Fördelningen (109 rader, 390px):** median 96px, p90 142, p95 157, max 215.
Klipps vid 80: **61**. Vid 120: 29. Vid 160: **5**. Vid 200: 1. Vid 220: 0.

Så taket som aldrig gällde (160) tar 56 av 61 fall av sig självt. Men en bredd ensam är
alltid en trimning och aldrig en garanti: en puck med fem etiketter i morgon klipper igen,
och tyst.

**Kortet har inte problemet**: `.card-tags` är `flex-wrap: wrap`. Bara radens fasta höjd
tvingar fram en enda rad.

## Utfall

Bägge halvorna byggda, och var och en fäller sin egen kontroll.

**Bredden** är taket som aldrig gällde, nu som en fast pixelbredd precis som varje annat
spår: `LIST_TAGS_TRACK = "160px"`, och `--list-fixed` summerar samma tal i stället för
golvet. Det tar 56 av 61 fall av sig självt.

**`+N`** tar resten, och `fitTagCells` är **en vandring över en färdig bräda, varje läsning
före varje skrivning**. Per cell inne i renderingsloopen vore en layout av en halvbyggd
bräda — fällan `colPlaces` redan dokumenterar — och att varva en läsning och en skrivning
per rad är samma layout 109 gånger. Två layouter för hela listan.

**Frågan om hur `+N` räknas fram besvarades av att inte räkna den.** Märkets bredd
*reserveras* (`--more-w`, 30px) i stället för att mätas, för hur brett `+N` renderar beror
på N, som beror på hur många piller som får plats, som beror på hur brett märket är. En
fast reservation klipper den cirkeln, och `min-width` på `.list-more` är det som får märket
att hålla sig till talet. Sabbat — reservationen borttagen — hänger märket **14px utanför**
sin egen cell.

Textbaserad uppskattning avfärdades alltså aldrig på sina meriter: den behövdes inte, för
den enda mätningen som krävs är piller-kanterna, och de läses ändå i samma svep.

**Efter, mätt mot samma data vid 390px:** 0 av 109 klipps, 5 rader får ett märke
(`#wasm #deploy +1`, `#collab +2`, …), och radens scrollbredd går från 976 till 1056 — 80px
mer sidled i en ruta som redan scrollade.

`mask-image` byggdes inte: den säger "det finns mer" men inte *hur mycket*, och siffran var
det som fattades.

**Vad som inte gjordes:** etiketterna ligger kvar sist bland spåren. `dateTrack`-precedensen
— en bredd per etikett ur den bredaste raden — håller inte, eftersom etiketternas text
varierar där datum är fixbreda; med `+N` på plats finns det ingen kvarvarande anledning att
försöka.
