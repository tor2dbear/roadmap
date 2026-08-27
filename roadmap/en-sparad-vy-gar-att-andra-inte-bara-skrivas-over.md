---
title: En sparad vy går att ändra, inte bara skrivas över
status: done
tags: [ui]
updated: 2026-08-27
created: 2026-08-26
---

## Goal
En sparad vy gick att skapa och att radera. Att *ändra* den fanns inte — bara att
skriva över den, genom att träffa dess namn exakt.

## Research

### Redigering var en kollision
`saveCurrentView()` gjorde hela jobbet i två rader:

```js
var views = savedViews().filter(function (v) { return v.name !== name; }); // same name = replace
views.push(entry);
```

Vägen att ändra `High` var alltså: öppna den, ändra filtren, tryck `Save view`, skriv
`High` igen. Det fungerade — men som namnkrock, med fyra följder ingen av dem avsedd:

- **Ingenting sa att det hände.** Ytan sa *"Saved to board.config.json as a commit"*,
  inte "det här ersätter High". Man fick veta efteråt, av att listan inte växte.
- **Namnet gick inte att ändra.** Rename betydde: spara en kopia under det nya namnet,
  radera den gamla. Två commits, och däremellan två rader som visade samma bräda.
- **Matchningen var exakt och skiftlägeskänslig.** `high` bredvid `High` gav två rader
  som såg likadana ut och visade samma sak.
- **Vyn flyttade sig.** `filter` behåller de andras ordning, `push` lägger sist — så att
  spara om en vy som låg först flyttade den till botten. En ändring som ordnar om listan
  gör något den aldrig sa att den skulle göra.

### Och åtgärderna passade inte läget
Chipraden erbjöd samma par oavsett var man stod. I en orörd sparad vy var enda åtgärden
`Save view` — den erbjöd sig att spara det som redan var sparat. Hade man ändrat något
fanns ingen väg att säga "uppdatera den här". Samma fråga tre gånger: **vad händer med
en sparad vy när den väl finns?**

### Vad som inte går att härleda
"Du står i High och har ändrat något" syns inte på brädan — en ändrad sparad vy ser ut
precis som vilket filter som helst. `activeSavedView()` svarar bara vid exakt matchning,
och där slutar det som går att läsa ur tillståndet. Proveniensen måste alltså minnas.

## Delivered
- **`state.fromView`** — vilken sparad vy man navigerade in i, som namn och bara det.
  Inte en andra kopia av filtret: frågan säger fortfarande vad brädan visar, det här
  säger var den kom ifrån. Medvetet *inte* i URL:en — parametrarna är vad en länk
  behöver bära, och proveniens skulle bli en andra sak länken måste hålla överens med
  dem om. En omladdning av en ändrad vy är därför ärligt bara ett filter, och säger det.
- **Tre lägen i chipraden**, som `activeSavedView()` och `editedSavedView()` avgör
  mellan sig: i vyn orörd → inga åtgärder (att erbjuda `Save view` är att erbjuda sig
  att spara det redan sparade); i vyn ändrad → `Reset` · `Update "High"`; ingen vy →
  `Clear all` · `Save view` som förut.
- **`Reset`** går tillbaka till vyns parametrar, inte till tomt. Det är skillnaden mot
  `Clear all` och skälet till att båda behövs.
- **`Update "High"`** — åtgärden som saknades. Målet är vyn man står i, så det finns
  inget att sikta på och ingen namnruta att träffa rätt.
- **`withView()`** — enda stället en vys parametrar skrivs in i listan: ersätt posten med
  det namnet *där den står*, eller lägg till när namnet är nytt. Både spara och uppdatera
  går genom den, så ingen av dem kan hitta på en egen ordningsregel.
- **`⋯` på sidomenyraden** med Rename / Duplicate / Remove. Ett ✕ var hela svaret på
  "vad kan hända med den här vyn"; tre åtgärder ryms inte på en knapp. Duplicate namnger
  automatiskt och lägger kopian *bredvid* originalet, inte sist.
- **Titeln säger `High (edited)`** i det ändrade läget. Utan det stod rubriken på
  `All pucks` medan knappen sa `Update "High"` — samma delade hjärna, ett steg mildare.

## Granskningsfynd och egna fel
- **Menyn låg i radens `<button>`.** Varje klick i den aktiverade också raden bakom:
  `applySavedView` → `refreshNav` → sidomenyn byggdes om och tog den öppna menyn med
  sig, innan åtgärden man just valt hann köra. ✕:et den ersatte skyddade sitt enda klick
  på samma sätt; en meny har fler klick än ett, så skyddet ligger på behållaren.
- **Två ytor, två olika rätt ankare.** `.sidebar` är en scroll-container och klipper i
  båda axlarna. Menyn (190px) måste speglas för att öppna *in* i sidomenyn; rename-ytan
  (340px) ryms inte där vid någon bredd — sidomenyn kan dras ner till 190 — så den blev
  ocentrerad i stället. Jag vände först båda åt samma håll och fick en yta på `x = -123`.

## Verification
Kört i webbläsaren med stubbat contents-API, så hela skrivvägen går på riktigt: i vyn
orörd → inga åtgärder; efter en förfining → `Reset` · `Update`, titel `(edited)`; Reset
→ tillbaka; Update → vyn uppdaterad **på sin plats** (`Först · Allt nu · Sist` före och
efter). Rename behåller platsen och titeln följer med; Duplicate hamnar direkt efter sitt
original; Remove tar bort raden och släpper proveniensen. Menyn och rename-ytan ligger
innanför både sidomenyn och viewporten vid minsta (190px), standard- och största (460px)
sidomenybredd samt i telefonlådan.
