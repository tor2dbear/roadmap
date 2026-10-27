---
title: Headern målas inte vid omladdning
status: inbox
tags: [ui, mobile]
updated: 2026-09-01
created: 2026-09-01
---

## Goal

Efter en omladdning på iPhone står `.topbar` tom — ingen ☰, ingen vytitel, inget
+ eller 🔍 — tills man skrollar en aning, då den kommer tillbaka och stannar. Den
enda kontrollen som finns för att öppna menyn, byta vy eller söka på mobilen är
alltså borta precis i det ögonblick sidan är ny för läsaren.

## Research

Mätt ur två skärmdumpar tagna en minut isär (samma vy, `Etapp site`, ett kort),
rad för rad i stället för på känsla — och skillnaden är väldigt smal:

- Bilderna är identiska överallt **utom** i två band: `y 206–319` och `y 339–342`
  (enhetspixlar, 3×). Omräknat är det `68–106` respektive `113` CSS-px.
- `.topbar` är 52px hög och innehåller 38px-höga `.ghost`-knappar. Bandet 68–106
  är exakt knapparnas rad; bandet vid 113 är exakt headerns `border-bottom`.
- **Allt under headern ligger på samma pixel i båda bilderna.** Sidan är alltså
  inte skrollad — `scrollY` är 0 i båda.

Slutsatsen den mätningen tvingar fram: lådan tar sin plats i flödet (de 52 px
finns, innehållet under står stilla) men **varken dess egen ram eller dess barn
målas**. Det utesluter de förklaringar man annars börjar i:

- Inte en klass. `body.viewing-puck` hade dolt `.top-title`/`.top-new`/
  `.top-search` — men aldrig headerns egen `border-bottom`, och `#board` hade
  varit dolt samtidigt (tavlan syns).
- Inte `display: none`. Då hade de 52 px försvunnit och innehållet flyttat upp.
- Inte skrollning. Se mätningen ovan.
- Inte JS som inte hunnit rendera. `#topTitle` har `All pucks` som text redan i
  `index.html`, och ingenting i `app.js` rör `.topbar`s synlighet.

Kvar står ett mål-/kompositeringsfel i WebKit på ett `position: sticky`-element
vid första målningen — det som en skrollning tvingar om och därför lagar. Det går
inte att återskapa i Chromium här (mätt: `.topbar` ligger på `y: 0`, `visibility:
visible`, `opacity: 1` i mobil-emulering), så nästa steg är en riktig iPhone.

**Sidoupptäckten som gör "skrolla lite" möjlig över huvud taget.** Vyn i
skärmdumpen har *ett* kort — det finns inget att skrolla. Ändå går det, och det
är `min-height: 100vh` på `.app` och `.maincol` som är orsaken: på iOS är `100vh`
det *stora* visningsområdet (verktygsfältet indraget), medan det synliga vid
laddning är det lilla. Dokumentet är därmed alltid högre än rutan med precis
verktygsfältets höjd, på varenda sida, oavsett innehåll. Mätt lokalt: en
enkortsvy ger `scrollHeight == clientHeight == 664` i Chromium, och de 664 kommer
från `min-height` — inte från innehållet (tavlan är 234px).

Kandidater att prova på enhet, billigast först:

1. `min-height: 100dvh` (med `100vh` kvar som fallback-rad före) på `.app` och
   `.maincol`. Tar bort spökskrollen — och därmed hela det tillstånd där sidan är
   skrollbar utan att ha innehåll att skrolla. `dvh` finns redan i filen (sheets).
2. Tvinga headern till ett eget lager så att den blir målad: `transform:
   translateZ(0)` eller `will-change: transform` på `.topbar`. Fungerar, men en
   transform på en sticky-låda gör den till containing block för `position:
   fixed`-barn — headern har inga i dag, men regeln är en fälla för nästa person.
3. Om ingen av dem biter: fixed header + spacer på mobil, vilket är den stora
   ändringen och därför sist.

## Open questions

- Är det omladdningen som är villkoret, eller första besöket också? Skärmdumparna
  visar bara omladdning.
- Händer det i vypucken också (`body.viewing-puck`), eller bara på tavlan?
- Vilken iOS/Safari-version? iOS 26 ritar sidan under statusraden med
  verktygsfältet nedtill, vilket är precis den kompositering som ändrats senast.
