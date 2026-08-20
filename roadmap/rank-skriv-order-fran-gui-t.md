---
title: "Rank: manuellt läge + skriv order från GUI:t"
status: done
tags: [ui, editing]
updated: 2026-08-20
created: 2026-08-19
order: 20
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

## Delivered

**Manual-läget är ärligt** (pass 0): `default` heter "Manual" och "Recently updated"
är ett eget läge. Det var halva problemet — ordningen var påslagen men osynlig.

**Drag till plats skriver `order`.** Att släppa mellan två kort räknar ut ett värde
mellan grannarna och skriver **en** fil. Glesa steg (10) ger utrymme; när ett
mellanrum tar slut går mittpunkten till decimal i stället för att numrera om
grannarna — att renumrera en kolumn från webbläsaren vore N commits som kan
halv-misslyckas. En droppzon-linje visar var kortet landar.

**Två grindar, båda om ärlighet.** Sorteringen måste vara **Manual** — i varje
annan härleds platsen ur ett fält, så hand-placering vore en lögn. Och
grupperingen måste vara **status**, för `order` är definierat som platsen *i en
status-kolumn*: att placera bland agent- eller priority-grannar hade räknat fram
ett tal mot puckar från andra statusar och tyst kastat om det riktiga brädet.
Övriga grupperingar behåller vanlig kolumn-drop, som skriver sitt eget fält.
Dessutom krävs verifierad skrivbehörighet, som resten av redigeringen.

**En flytt = en commit.** `commitFields()` skriver flera frontmatter-nycklar i en
PUT, så ett kort som dras till en annan kolumn *och* en plats skriver `status` +
`order` tillsammans. Två commits hade läst som två beslut i historiken.

**CLI:t fick sin del:** `roadmap move <slug> --before|--after <slug>` (samma
grannregel som brädet, men med validering: samma kolumn, inte sig själv, ankaret
måste finnas) och `roadmap renumber [--status]` som städar tillbaka till 10, 20,
30 … Bulkoperationen bor lokalt, enfilsskrivningen i browsern — den uppdelningen är
avsiktlig.

**Beslut om `priority`: den stannar.** Alternativet — slopa fältet och låta manuell
rank vara enda ordningen — var på bordet, men `priority` bär PO-routningen och syns
som badge utan att man sorterar om. I stället är rollerna nu **nedskrivna** i
`CONVENTION.md` som fyra ortogonala axlar: `status` = vilken kolumn, `order` =
platsen i den, `priority` = etikett att filtrera/sortera på (inte default-ordning),
`target` = horisont. Det var den verkliga skulden — inte antalet fält.

**Kortet visar rätt datum** (pass 2–3) och grupperingen kan vara vilket fält som
helst (pass 2), så drag-till-plats fungerar i alla grupperingar som har en skrivare.

Verifierat: 8 fall i headless Chromium (läges-grinden i tre varianter, placering
inom kolumn, placering över kolumngräns, optimistisk rendering, återställning vid
misslyckad skrivning, felmeddelande) + de tre tidigare sviterna som regression.
CLI:t testat mot riktiga filer inklusive felfallen och idempotent `renumber`.

Testet hittade en riktig bugg: ett gruppfält hette `valueOf`, vilket ärvs från
`Object.prototype` — så *varje* grupp såg ut att ha en nyckel-till-värde-konverterare
och status skrevs som `[object Object]`. Heter nu `toValue`.

## Medvetet inte byggt
- **"Flytta upp/ner" i radens meny för mobil.** Drag-till-plats med tumme är
  klumpigt, men lösningen hör ihop med listvyns radmeny som inte finns än.
- **Att slå ihop de sex `commit*`-hjälparna** till `commitFields()`. De gör nästan
  samma sak, men refaktorn hör inte hemma i samma pass som funktionen.

## Open questions
- Mobil: drag-till-plats fungerar dåligt med tumme — "flytta upp/ner" i radens meny
  skriver samma fält när den menyn finns.
- Ska `renumber` kunna ge *oordnade* puckar ett `order` (i dag rör den bara dem som
  redan har ett)? Att frysa alla i en rank ingen bett om vore värre — men det gör
  första drag-till-plats i en orankad kolumn lite överraskande: kortet hoppar högst
  upp, eftersom rankade kort sorteras före orankade.
