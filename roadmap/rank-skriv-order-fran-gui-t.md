---
title: "Rank: manuellt läge + skriv order från GUI:t"
status: next
tags: [ui, editing]
updated: 2026-08-20
created: 2026-08-19
order: 40
---

## Goal
Göra "prioritera" fullt utförbart i cockpiten: se att den manuella ordningen är på,
dra en puck till rätt *plats* och få det skrivet till git — och samtidigt reda ut de
rank-begrepp som konkurrerar.

## Research

### Den manuella ordningen finns redan. Den heter bara fel.
```html
<!-- index.html:90 -->
<option value="default">Recently updated</option>
```
`default` sorterar `order` **först** och `updated` bara som tiebreak. Menyvalet man
står i *är* alltså den manuella ordningen — etiketterad som något annat. Två begrepp
på en menyrad, och därför ser det ut som att manuell sortering saknas. (26 av 32
pucker i det här repot har `order` satt, men fältets verkan är osynlig.)

Kodens egen kommentar har redan tagit rätt beslut: *"the explicit modes drop `order`
since the choice is deliberate."* Manuell ordning och fältsortering är **lägen som
utesluter varandra**, precis som i Linear.

### Snitt
1. **Dela menyraden i två:**
   ```html
   <option value="default">Manual</option>
   <option value="updated-desc">Recently updated</option>
   ```
   ```js
   var SORTS = ["default", "updated-desc", "priority", "updated-asc",
                "created-desc", "created-asc", "title", "target"];
   if (state.sort === "updated-desc") return byDate("updated", -1);
   if (state.sort === "target")      return byDate("target", 1);
   ```
   Fyra rader → ärligt manuellt läge, en äkta "senast uppdaterad" som ignorerar
   `order`, och target-sortering när fältet finns.
2. **`commitOrder`** — släpp mellan två kort → skriv `order` på den flyttade pucken.
   Ett fält på en fil per drag; ingen omnumrering av grannarna (glesa steg om 10,
   som pucksen redan har, och halvera mellanrummet vid insättning).
3. **Bara i Manual.** I explicita sorteringar är korten inte dragbara till plats —
   korrekt, men det måste *synas* (tonat draghandtag), annars läses det som en bugg.
4. **`roadmap move <slug> --before|--after <slug>`** i CLI:t, hellre än ett rått
   `order <n>` man får räkna ut själv.
5. **Skriv ned modellen** i `CONVENTION.md`:
   - `status` = vilken kolumn
   - `order` = plats i kolumnen (manuell rank)
   - `priority` = etikett och filter, **inte** default-sortering
   - `target` = horisont (se `tidsaxel-target-horisont`)

### Den öppna designfrågan
Fyra axlar är en för många. Alternativet — slopa `priority` som fält och låta manuell
rank vara den enda ordningen, som Linear i praktiken gör — är billigare att
underhålla och svårare att hamna i konflikt med. Men `priority` bär också
PO-routningen (`po-lager`) och syns som badge utan att man sorterar om. Beslutet bör
tas innan `target` landar, inte efter.

### Koppling
Ordering-raden bor i Display-menyn — se `display-meny-och-gruppering`. Den här
pucken äger radens *innehåll* och skrivvägen; den pucken äger menyn.

## Open questions
- Behåll `priority` som fält, eller degradera till ren etikett och låt `order` vara
  enda ordningen?
- Glesa `order`-steg räcker länge men inte för alltid — behövs ett
  "normalisera ordningen"-kommando i CLI:t från start?
- Drag mellan kolumner: skriver `status` och `order` i **en** commit eller två?
  (Förslag: en — annars blir historiken brusig.)
- Mobil: drag-till-plats fungerar dåligt med tumme. Behövs "flytta upp/ner" i radens
  meny som skriver samma fält?
