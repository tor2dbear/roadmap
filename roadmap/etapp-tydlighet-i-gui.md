---
title: "Etapp: tydlighet i GUI:t"
status: now
tags: [ui, product]
updated: 2026-08-25
created: 2026-08-23
order: 5
depends: [ui-primitiv-och-skalor]
parent: gui-hantverk
---

## Goal
Ge etappen Linears *läsbarhet* utan att köpa Linears *ontologi*.

## Research
Linear är tydligt för att `project` och `issue` är olika objekt med olika namn,
ikoner och sidor. Vår modell är motsatsen — **ett** objekt sett från två håll — och
det är rätt för agenter och git, men det kostar läsbarhet. Allt nedan köper tillbaka
den kostnaden utan att införa en andra posttyp.

Fem fynd, i fallande ordning av hur mycket de skymde:

1. **Etapp och medlem bar samma märke.** `progressBadge` (etappens rollup) och
   `etappChip` (medlemskapet) använde båda `icon("merge")` — samma symbol för
   *innehåller* och *tillhör*, alltså motsatta riktningar. Och `puckGlyph` var
   identisk för alla pucks, så på tavlan gick det inte att se vilket kort som var en
   etapp.
2. **Rollupen var en siffra där en form räcker.** (Avvaktar: se rangordningen.)
3. **`Contains` var en kommaseparerad löptext.** Fungerar för två pucks, kollapsar
   vid åtta.
4. **Brödsmulan lärde inte ut hierarkin.** `All pucks › Logga in` — etappen syntes
   bara som ett fält långt ner.
5. **Relationen gick bara att skapa från barnet.** `parent:` skrivs på medlemmen, så
   från en etapp gick det inte att lägga till pucks.

## Delivered
- **Ett eget glyf för etappen.** Två prickar på ett spår — commit-märket, två
  gånger. Det måste skilja sig vid 12px, vilket är varför det är prickar och inte en
  behållarkontur: en kontur blir en fläck i den storleken, medan ett *antal* prickar
  fortfarande går att läsa. `merge` betyder nu bara medlemskap, och rollup-brickan
  bär etappmärket.
- **Brödsmulan bär etappen.** `All pucks › Auth › Demo · logga-in`. Det lär ut
  strukturen varje gång man öppnar en puck och gör nivån ovanför ett tapp bort i
  stället för en skrollning.
- **`Contains` är en sektion med rader.** Statusprick, titel, egen rollup om
  medlemmen själv är en etapp, och target. Etappsidan är platsen där man *kör*
  etappen, inte bara läser att den finns.
- **`＋ Add puck` från etappens sida.** Relationen är fortfarande authored på barnet
  — `changeParent(vald, etappen)` är samma enfältsskrivning med argumenten omkastade.
  En riktning i datan, två i gränssnittet. Utan medlemmar behåller skenan en tyst
  kontroll, så en etapp går att *starta* uppifrån.
- **Rollupen räknar direkta barn.** Beslutat: det komponerar — varje nivå svarar för
  sitt eget, och en underetapp visar sin egen `N/M` i medlemslistan.

- **Navigationen fick två jobb i stället för ett.** Sidomenyn blandade två sorters
  rad. Nu tre block: **Inbox** överst för sig (ett rum man går till för att *tömma*
  — koden sa det redan, `all` är bokstavligen `-status:inbox`; bara presentationen
  sa något annat), **Views** = utsnittet man valt (All pucks · Etapps · Standalone),
  **Signals** = brädets egen åsikt (Ready · ⚠ Needs attention).
- **`Standalone` — den lösa pucken, som vy.** Predikatet fanns redan som
  `is:orphan`; det saknades bara en dörr till det. Med `is:member` (ny) blir de tre
  lägena kompletta: `is:etapp` + `is:member` + `is:standalone` täcker varje puck, och
  det enda som räknas två gånger är underetapperna — som *är* bägge. `is:standalone`
  är alias för `is:orphan`, så frågespråket säger samma ord som knappen.
  Det här är den billiga vägen till "etapper och lösa pucks som två vyer": `all`
  behöver inte börja ljuga genom att gömma medlemmar, och beslutet om den ska göra
  det kan tas när det finns riktiga etapper att titta på.
- **Vyerna definieras en gång.** `VIEW_DEFS`/`VIEW_GROUPS` läses av både sidomenyn
  och ⌘K-paletten. Innan dess var palettens lista handskriven — och Etapps saknades
  där, en drift som uppstod i samma stund raden lades till i sidomenyn.
- **En rad tjänar sin plats på det den tillför, inte på hierarki i allmänhet.**
  Första försöket grindade både Etapps och Standalone på `counts.etapps`, och
  renderade *All pucks 31 / Standalone 31* — samma lista under två namn, exakt vad
  kommentaren ovanför sa att grinden skulle hindra. Vår enda etapp låg i inkorgen.
  Rätt grind: Etapps visas så snart en etapp finns (den kan ligga i inkorgen, och då
  är vyn enda vägen dit), Standalone bara när den *skiljer sig* från All pucks.
  Hittat genom att titta på den renderade sidomenyn, inte i koden.

- **Tre fynd som bara riktig data kunde ge.** Efter att repots egna pucks delats i
  tre etapper (`gui-hantverk` 0/5, `gui-editing` 2/2, `productize` 2/3):
  - **`Ready` erbjöd en etapp.** `gui-hantverk` deklarerar inga `depends:` och var
    därför oblockerad — samtidigt som fyra av fem medlemmar väntade på varandra.
    Vyn *agenter läser för att välja arbete* erbjöd det enda man inte kan välja, och
    dolde att innehållet stod stilla. `is:ready` kräver nu också att pucken saknar
    barn: en etapp är inte arbete man plockar upp, det är dess delar som är det.
  - **En etapps status kunde motsäga sina delar utan att någon sa något.**
    `productize` stod `done` med 2/3. Nu två flaggor, samma par och samma skäl som
    issue-driften: `rollup-open` (klar med öppna delar) och `rollup-done` (alla delar
    landade, etappen inte). En puck utan barn träffas aldrig av regeln.
  - **`Contains` listade i slug-ordning.** Harvestern sorterar `children[]` på id
    *"for stable output — the board sorts them for display itself"* och `childItems()`
    sorterade inte. Kommentaren var ett löfte koden inte höll. Nu status → rank →
    titel, alltså den ordning man arbetar dem i.
- **Beslutat: brädet förblir platt.** `all` blir *inte* `-status:inbox -is:member`.
  Skälet är vad en kolumn ska mäta: platt mäter kolumnen **arbetsmängd**, som karta
  hade den mätt **antal initiativ**. Bägge är rimliga, men bara den första svarar på
  frågan man ställer när man tittar på `now`. Och kostnaderna är verkliga — `Ready`
  måste ändå behålla medlemmarna (man plockar upp en medlem, inte en etapp), så de
  två vyerna hade slutat vara delmängder av varandra; "All pucks" hade slutat vara
  alla pucks; och underetapper, som är både etapp och medlem, hade fallit bort.
  `Standalone` ger samma uppdelning som en **lins man går in i och ut ur**, utan att
  låsa fast vad brädet betyder. Det är den billigare formen av samma sak.

- **Titeln är vy-switchen.** Att spara en vy skedde i Display-menyn uppe till höger
  och resultatet dök upp i sidomenyn längst till vänster — bakom en låda på telefon.
  Två hörn för en handling och dess resultat, och koden erkände det: spara-hinten
  *måste* säga "and shows in the sidebar". Bägge bor bakom titeln nu, som redan är
  namnet på vyn man står i. Ett tapp i stället för en låda.
  Raderna kommer från `viewsShown()`, samma anrop sidomenyn gör, så de två listorna
  kan inte säga olika om vilka vyer som finns — driften som gav en palett utan
  Etapps och "All pucks 31 / Standalone 31".
- **Etapp-chippen är en väg dit, inte en etikett.** På ett platt bräde kan ett kort
  och dess etapp ligga kolumner isär, så den enda plats där relationen *står* på
  tavlan gjorde ingenting — den upprepade ett namn med `cursor: help`. Nu en knapp
  som öppnar etappen (och stoppar klicket från kortet under, som öppnar pucken
  själv). Saknas etappen finns ingen chip att klicka på, och då är den text igen.
- **Reponamnet och chippen läste som en fras.** `Etapp ⑂ GUI-hantverk` — det första
  ordet är *repot*, resten är medlemskapet, och meta-raden skiljer sina delar med
  bara ett mellanrum. Chippen bär en egen avdelare på kortet nu. Ett problem som
  bara syns i ett repo som självt heter Etapp, alltså bara med riktig data.
- **En vy har ett antal, inte två.** Sidomenyn pinnade ut arkivet oavsett växeln
  *"so the count doesn't jump"*, så med Show done på sa sidomenyn 2 och vyhuvudet 4
  om samma vy. En siffra som hoppar förklaras av knappen man just tryckte; två olika
  siffror för en vy förklaras aldrig. Räknaren lyder växeln nu, och ett test kräver
  att sidomenyn, vyhuvudet och antalet kort är samma tal i bägge lägena.
- **En optimistisk ändring når hela gränssnittet.** Fyra granskningsfynd som alla
  hade samma form: en ändring uppdaterade *en* del av vyn och lämnade resten kvar.
  - `＋ Add puck` skriver **barnet**, så bara barnet ritades om — Contains-listan och
    rollupen på etappsidan man faktiskt stod på stod kvar tills man stängde och
    öppnade igen.
  - En statusändring rörde inte navigationen, så sidomenyn kunde fortsätta räkna en
    puck som ett klick inte längre visade.
  - `placeCounts()` pinnade ut arkivet medan `goToPlace()` bevarar växeln, så ett
    repo-chip sa ett tal och klicket visade ett annat.
  - Rollup-flaggorna räknas bara vid skörd, så följde man en `rollup-done`-varning
    och markerade etappen klar stod varningen kvar en timme.
  Nu en `afterEdit()` som varje skrivning går genom — bräde, navigation och den
  öppna pucken, *vilken ände av ändringen den än är* — plus `syncRollupSignals()`
  som härleder paret av egen status och progress, precis som `recountEtapp` redan
  härleder progressen. Regeln står på två ställen (här och i harvestern), vilket är
  samma pris `relink` redan betalar: en optimistisk ändring måste härleda det
  harvestern härleder, annars motsäger tavlan sig själv fram till nästa synk.
- **Väljaren erbjuder inget den inte kan skriva.** `＋ Add puck` skriver den *valda*
  puckens fil, inte etappens — så på en flerrepo-tavla kunde den erbjuda pucks ur ett
  repo token inte äger. Valet hade committat, misslyckats, rullats tillbaka, och
  sedan erbjudits igen.
- **Medlemmens status står i ord.** Prickens kulör var enda skillnaden mellan Now,
  Next och Later, och radens `title` är en hover-tooltip som en färgblind läsare på
  touch aldrig når. Nu samma statuspill som korten använder — komponenten som redan
  finns för att säga en status *i ord*. `.status-dot` var dess enda användning och är
  borta.
  **Och en rättelse till mig själv, en timme senare:** jag lade pillret *först* i
  raden med `width: 62px` för att titlarna skulle stå i kolumn — och klippte `Inbox`.
  En fast bredd är fel för ett ord: etiketterna går från 49px (`Now`) till 87px
  (`Cancelled`). Pillret ligger sist nu, i sin naturliga bredd; då linjerar titlarna
  på sin vänsterkant, vilket är bättre än vad prefixkolumnen gav, och statusen sitter
  där ögat ändå söker den. Testet renderar alla sex statusarna och kräver att ingen
  klipps.
- **Sex följdfel av gårdagens fixar — fem av dem mina.** Granskningen fortsatte
  medan jag rättade, och pekade på precis de vägar in jag hade missat:
  - **Drag-vakten läste `state.group`, inte den effektiva.** Inkorgen faller tillbaka
    på repo medan det lagrade valet står kvar på status — så status-droppzonen var
    aktiv över repo-kolumner och räknade en rang mot ett annat repos kort.
  - **`setDisplay` byggde inte om navigationen.** Så snart sidomenyns siffror började
    läsa `state.showDone` blev arkivväxeln en ändring som flyttar dem — och den ritade
    bara om brädet. Nu är regeln "en display-ändring uppdaterar chromet", inte en
    lista över vilka som gör det.
  - **`changeOrder` gick förbi härledningen.** Ett släpp mellan statuskolumner *är* en
    statusändring med en rang på köpet; jag dirigerade bara väljarens väg.
  - **`afterEdit` ritade innan den städade.** `buildAgentChips()` rensar en tömd
    agent ur `state.agents`, och den mängden är en del av frågan brädet renderar —
    så ordningen måste vara navigation först, bräde sedan.
  - **`＋ Add puck` grindades på fel repo.** Den skriver **barnets** `parent:`-rad, så
    det är barnets skrivbarhet som avgör. En token som äger ett annat källrepo kan nu
    lägga till därifrån till en etapp den aldrig kunde redigera själv. Predikatet
    (`memberCandidate`) frågas två gånger — en gång för att avgöra om kontrollen ska
    finnas, en gång för att fylla den.
  - **`AGENTS.md` dokumenterade inte `etapps`/`standalone` som vyer.** `is:`-tabellen
    hade jag uppdaterat; URL-kontraktet glömde jag.
  Mönstret är detsamma hela vägen: jag skrev `afterEdit()` för att *"varje skrivning
  är skyldig resten av gränssnittet detta"* — och missade sedan två av vägarna in i
  den. Att skriva regeln räcker inte om man inte också letar upp alla anropare.

- **Fynd 2, och svaret blev nej till ringen.** Frågan sköts medvetet upp tills det
  fanns riktiga etapper att titta på. Nu finns fyra, med **1, 2, 3 och 5** delar — och
  vid de storlekarna är en ring det *sämre* instrumentet. `0/1`, `1/2` och `2/3` ritar
  0 %, 50 % och 67 % medan läsarens faktiska fråga — hur många är kvar — är "en" för
  alla tre. En ring förtjänar sin plats där antalet slutar betyda något (37/120 →
  "ungefär en tredjedel"), och ingenting på den här tavlan är i närheten.
  **Och till slut ingen andel alls.** Först en fyllnad bakom siffrorna: granskningen
  fångade priset, mätt på egna pixlar och inte taget på ord — 10px `--ink-2` ligger på
  4.58:1 mot den bara brickan i ljust läge och 4.67:1 i mörkt, knappt över de 4.5 liten
  text kräver, och varje fyllnad synlig nog att läsa drog ned det till 4.09 respektive
  4.15. Ingen opacitet var både synlig och säker. Sedan en 2px-regel längs underkanten,
  fri från glyferna — som såg rätt ut i test och fel i handen: en rak regel målad på
  underkanten av en **helt rundad pilla** klipps i bägge ändar av radien, så den börjar
  och slutar vid ingenting och läser som ett understruket "2/" snarare än ett mått.
  De två varianter som rättar det kräver bägge en fyrkantigare bricka, och där tog
  resonemanget slut: **att betala med brickspråket för ett mått som inte tillför något
  är fel byte.** Vid 1–5 delar är siffran redan exakt och fullständig; varje
  proportionsmarkering är en andra, grövre kopia av vad `2/3` redan sagt. Det är
  argumentet som dödade ringen, och det dödar stapeln lika hårt — stapeln fanns bara
  som räddning efter att fyllnaden förlorat kontraststriden, och en räddning av en idé
  som inte bar är fortfarande ingen design.
  En ram som ritas en bit runt brickan prövades också, eftersom den *har* en kant och
  följer formen. Den föll på samma sak, plus en fälla värd att skriva ned: den
  CSS-enda versionen (`conic-gradient` som rammålning) mäter **vinkel**, inte
  perimeter. På en bricka som är tre gånger bredare än hög täcker 2/3 i vinkel närmare
  85 % av konturen — den ljuger. En perimeterriktig version kräver en SVG per bricka,
  måttsatt efter just den brickans bredd.
  Testet vaktar frånvaron i **pixlar**, i bägge teman: brickans yta ska vara orörd
  tvärs hela bredden, rad för rad. Förr mätte samma test att stapelns kant stod på
  66 % mot väntade 67.
  Två felmätningar på vägen, bägge värda att minnas. Den första svarade 86 % — den
  samplade inuti pillrets rundade hörn. Den andra svarade 0 och var tystare: den tända
  raden i labels-arket låg på y=2886 i en 800px vy, pixeluppslaget gav `undefined`, och
  varje jämförelse "skilde sig". Ett test som mäter utanför bilden ska säga det, inte
  svara noll — så nu rullas raden fram först, och en spärr faller om den ändå hamnar
  utanför.

- **Två återställningar blev en komponent.** Display-menyns *Reset to default* var
  `--ink-3`, Settings *Reset sidebar width* var accentröd. Ingen av dem är destruktiv
  — de återställer, de tar inte bort — så röd var fel på den som hade det, och två
  färger för en och samma handling var fel på bägge. En `.resetbtn` nu, med
  återställningsmärket på bägge; `dp-reset`/`set-linkbtn` står kvar som krokar.
  Testet jämför de två **mot varandra** och inte mot en färgliteral, för påståendet
  är att de *är* samma kontroll.

## Open questions
