---
title: "Läsbarhet: kontrast, märken och skenans höjd"
status: now
tags: [ui]
updated: 2026-08-26
created: 2026-08-26
order: 5
parent: gui-hantverk
---

## Goal
Stänga gapet som en sida-vid-sida med Linear faktiskt visar. Inte "finish" i
allmänhet — tre mätbara saker: gränssnittets andra röst går inte att läsa, två
märken på samma kort är ritade av två olika system, och egenskapsskenan tar halva
skärmen innan innehållet börjar.

## Research
Utgångspunkten var sex skärmdumpar — Linears projekttavla och projektsida mot vår
tavla och puckssida, i båda temana. Fynden är mätta ur `styles.css` och ur en
kontrastgranskning av den renderade sidan, inte tyckta.

**Kontrasten var under golvet överallt.** `--ink-3` låg på 2.4–3.1:1 mot varje yta
den kan hamna på, i båda temana. Den bär kolumnräknarna, kortdatumen, taggpillren,
nyckelkolumnen i skenan, varje tomt värde (`No priority`, `Set target`,
`Unassigned`), brödsmulorna, mono-ögonbrynen och de vilande flikarna — alltså
större delen av den andra rösten, satt i 10–13px. AA-golvet för text under 18,66px
är 4.5:1. Det är *detta* som gjorde att den ljusa tavlan såg blekare ut än Linears,
och det var aldrig layouten.

De semantiska sex bar samma fel: i ljust läge låg `--later` på 2.6:1, `--done` på
3.2:1, `--cancelled` på 2.4:1 — och alla tre sätter ord, inte bara prickar
(`.status-pill`, `.flag`, `.disc-*`, `.issue-state`, `.rollup.full`). Mörkt läge
klarade sig bättre; bara `--ink-2`/`--ink-3` och ett par marginalfall behövde röras.

**Två märken, två system.** `warn-badge` var det bokstavliga tecknet `⚠`, och satt
en rad från `blockBadge()` som ritar `icon("slash")` ur uppsättningen. Ett
skrivtecken tar vikt, optisk storlek och baslinje från vilket typsnitt plattformen
råkar falla tillbaka på — U+26A0 finns i ingen av stackens skärningar — och på en
maskin som löser det till en färgemoji gör `color: var(--later)` ingenting alls.
Uppsättningen hade helt enkelt inget varningsmärke.

**Titeln var kortets enda indragna rad.** `.card-head` skjuter titeln 22px in
förbi glyfen, medan `.card-meta` och `.card-tags` börjar vid kortets padding. Linears
kort har samma märke och lägger andra radens ikon på samma x — de har en ikonräl,
vi hade en glyf som hängde på ingenting.

**Skenan tar halva sidan.** Mätt i skärmdumparna: Linear lägger ~200px på hela
egenskapsrälsen — status, prio, lead, datum och två team ryms på *en* radbruten rad.
Vi lägger ~580px på samma sak, för `.prop` är en rad var med `min-height: 34px`,
padding och hårstreck. Titeln står på y≈170 och `Goal` börjar på y≈1020: innehållet
börjar under mitten av skärmen. Fem av de åtta raderna säger dessutom att ingenting
är satt. `polering-av-egenskapsskenan` löste hur ett tomt fält *ser ut*; det som står
kvar är hur mycket plats det *tar*.

## Delivered
- **Varje färg som bär ord klarar 4.5:1** mot den mörkaste yta den kan hamna på — i
  ljust `--sidebar-bg`, i mörkt `--panel-2`. De semantiska sex flyttar med samma
  regel i stället för att få text-only-tvillingar: pricken är samma token i 10px, och
  en prick som klarar 4.5 klarar de 3:1 ett märke behöver med marginal. Priset är att
  ljusa `--later` tappade sitt guld — `#b8944a` lästes på 2.6:1, och brons är hur en
  amber som går att läsa ser ut på varmt papper. `--done` och `--cancelled` behöll sin
  inbördes ordning, för genomstrykningen kan inte vara det enda som skiljer dem.
- **En härledd token för amber på amber.** Flaggan och den intryckta
  attention-chippen ligger på en 12–18%-tvätt av *sig själva*, vilket drar underlaget
  mot texten och äter marginalen (4.7 → 4.0). `--later-ink` deklareras en gång, i
  `:root`, och re-resolvar med temats `--later` och `--ink` — mörkare i ljust,
  ljusare i mörkt, utan en andra deklaration.
- **`warn` är en väg i uppsättningen.** Samma 15-rutnät, samma streck, samma 14px-låda
  som `slash` bredvid. Och `warnBadge()` finns en gång i stället för två — den var
  utskriven identiskt på kortet och på listraden.
- **Kortet har en ikonräl.** `--glyph` + `--rail` på `.card`, och de två raderna under
  titeln hänger på summan. Härledd ur de två tal som ritar den, så de inte kan glida
  isär. Direkta barn bara: `.card-tags` är också LABELS-raden på puckssidan, som har
  sin egen räl.

## Verification
En kontrastgranskning som komponerar varje genomskinligt lager över sidan och mäter
varje textnod mot det den faktiskt ritas på: **0 noder under AA** på tavlan och på
puckssidan, i båda temana. (Första försöket rapporterade falska fynd — `color(srgb
…)` ger 0–1 där `rgb()` ger 0–255. Värt att veta nästa gång.)

Selen var en engångsrigg och ligger inte i repot: den drar in Playwright, och det
här är ett repo utan beroenden. Den hör hemma i `pr-preview.yml` bredvid
syntaxkontrollen och skörden om regeln ska hålla över tid — men det är ett eget
beslut, inte en bieffekt av det här passet.

## Vidare
Kvar från granskningen, i fallande ordning av hur mycket de skymmer:

1. **Komprimera skenan.** Status/Priority/Target/Agent är fyra chips som ryms på en
   rad. Åtta rader à ~46px är inte densitet, det är åtta beslut som fick var sin rad.
2. **Tomma fält bakom `⋯`.** Fem rader som säger att ingenting är satt kostar lika
   mycket som fem som säger något. Linear visar dem inte alls; ett `+ Add property`
   räcker.
3. **Balansera verktygsraden.** `Filter` och `Display` som två likaviktiga
   konturknappar längst till vänster, och 1400px tomt till höger. Linear delar det i
   *vilken vy* (till vänster) och *vyns inställningar* (ikonknappar till höger, med en
   prick när något är ändrat). `.ghost.active` finns redan och behöver bara betyda
   "filter är satt".
4. **`×` och `Add` på Blocked by är råtext.** Den minst färdiga kontrollen på sidan,
   och den syns direkt bredvid Linears `+`-chips.

## Open questions
- Blir bronsen fel på tavlan när LATER-kolumnen är lång? Guldet var en del av
  intrycket, och en prick behöver bara 3:1 — men två tokens för en färg är precis den
  sortens steg `ui-primitiv-och-skalor` städade bort. Ett byte av `--later` tillbaka
  är en rad om svaret blir ja.
- Linears "Latest update"-kort är deras kärna och något vi medvetet avstår
  (`CLAUDE.md`: ingen andra sanningskälla, inget aktivitetsflöde). Frågan är om
  Activity-fliken ska bära något av det, eller förbli ren git-historik.
