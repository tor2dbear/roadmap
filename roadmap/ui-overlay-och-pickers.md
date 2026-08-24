---
title: "UI-ramar: overlay-primitiv och pickers"
status: now
tags: [ui, product]
updated: 2026-08-24
created: 2026-08-21
order: 5
parent: gui-hantverk
---

## Goal
Sätta ramarna för *hur* ytor visas — en overlay-primitiv med två presentationer
(popover på desktop, bottom sheet på mobil) — och en regel för när en picker får
erbjuda "skapa nytt". Så att nästa fält som behöver en yta inte blir en åttonde
variant.

## Research

### Läget: åtta ytor, noll beslut
Varje gång ett fält behövt en yta har närmaste befintliga lösning valts. Nu finns:

| Yta | Används av |
|---|---|
| `.modal-backdrop` + `.modal` | puck-detaljen på mobil |
| `.filter-pop` | filterpanelen |
| `.display-pop` | Display-menyn (ärver `filter-pop`) |
| `.pick-menu` | status / priority / agent |
| `.pick-find` | puck-väljaren |
| `.token-backdrop` + `.token-panel` | ny puck, token, spara vy |
| `.cmdk` | paletten |
| `window.prompt` ×4 | Issue, Labels, Target, namnge vy |

Det är inte åtta designbeslut — det är ett beslut som aldrig fattades. Den åttonde
är värst: `window.prompt` ritas av operativsystemet, så på iOS dyker en systemdialog
upp mitt i appen, i sina egna färger och former. Den läser som en annan produkt.

### Mönstret som ledde fel
`Target` och `Issue` använde redan `window.prompt`, så `Etapp` och `Blocked by` fick
samma. Men de fälten är olika sorters fält:

- **Ett värde du bär i huvudet** — ett datum, ett issue-nummer. Att skriva det är rimligt.
- **En referens till något som redan finns** — en puck. Att kräva att du minns dess
  slug (och `owner/repo#slug`-syntaxen) är att lägga harvesterns jobb på användaren.

Det andra fallet ska *väljas*, inte stavas. Puck-väljaren finns nu; resten av den här
pucken handlar om ramen omkring.

### Utvärdering av referenserna (Notion/ClickUp-liknande, mobil)

**Tas med:**
- **Token i inmatningsfältet.** Valt värde ligger som en chip *inuti* sökfältet, med
  ✕. Nuvarande värde och sökfält blir samma kontroll — samma form bär både envärdes-
  (`Etapp`) och flervärdesfall (`Blocked by`).
- **Sök + skapa i samma fält**, för öppna mängder. "Ny «X» i *Resurser*" — måldatabasen
  namnges. Hos oss måste repot namnges av en tyngre anledning: pucken blir en fil i
  ett repo, permanent, och det är flödets enda irreversibla val.
- **Ikon som säger vilken sorts sak raden är.** Deras axel är sidtyp; vår är **repo**.
  Repo-prick + titel, så det syns att `vfs` ligger i PIA och inte här — hela poängen
  med cross-repo-referenser.
- **Kuraterat tomt läge.** Inte A–Ö: samma repo först, sedan senast uppdaterade.
  Med 138 pucks är alfabetisk ordning obrukbar.
- **`?` i sheet-huvudet** som pekar till `CONVENTION.md` — ovanligt passande för ett
  verktyg vars konvention *är* produkten.
- **Datepicker: fält + rutnät, live-kopplade** (skriv `2026-08-21` → 21:an tänds),
  plus **Rensa** längst ned.

**Väljs bort:**
- **"Skapa ett alternativ" på slutna fält.** Se beslutet nedan — det är det viktigaste
  i hela pucken.
- **`…`-meny per alternativ** (döp om / färglägg / ta bort). Det är schemaredigering
  från en picker. Vårt schema bor i `CONVENTION.md` och i koden; att kunna ändra det
  från en dropdown vore en andra sanning om *fältdefinitionen*, inte bara om värdet.
- **Slutdatum, Inkludera tid, Påminn.** Ett spann blir sprintdatum och påminnelser
  kräver en backend — båda står redan under "medvetet avstått".
- **Skinnet.** Rundade vita kort och iOS-typografi är deras språk. Vi tar strukturen,
  inte utseendet; våra tokens och vår kantradie gäller.

## Beslut (tagna innan bygget)

### En primitiv, två presentationer
Innehållet (en lista, en kalender, ett formulär) ska vara oberoende av behållaren.
Presentationen är en **parameter**, inte en förgrening i varje anropsställe:

- **≥ 640 px → ankrad popover** intill det du klickade.
- **< 640 px → bottom sheet** med draghandtag och titel.

Samma drag som `GROUPS` i pass 2: gruppering blev en variabel och samma renderare gav
status-tavla, agentkö och tidslinje. Här ger samma listkod popover och sheet.

### Öppna vs slutna värdemängder avgör om "skapa" finns
> **Sök + skapa erbjuds bara där värdemängden är öppen** — taggar och pucks. För
> slutna gränssnittsfält (`status`, `priority`) finns inget "skapa".

Inte av principskäl, utan för att alternativet går sönder: ett påhittat `priority`
skrivs till pucken, commiten går igenom, chipen syns — och vid nästa skörd kastar
`normalizePriority()` värdet och fältet är tomt igen. **Skrivningen ser ut att lyckas
och försvinner sedan.** Det är samma felklass som `depends-missing`,
`parent-cycle` och den orensbara `parent`-länken: något släpps tyst och datan börjar
ljuga.

Gränsen finns redan i koden — `GROUPS.status` är `fixed: true` (kolumnerna står kvar
även tomma) medan agent/repo/priority bara listar det som finns. Samma gräns,
applicerad på pickers.

### Tangentbordet får ligga över innehållet
Sheeten **krymper inte**. Den behåller sin höjd och tangentbordet lägger sig över —
ingen omflödning när tangentbordet kommer och går, scrollpositionen är kvar, och
koden slipper `visualViewport`-lyssnare. Tre villkor gör det korrekt i stället för
slarvigt:

1. **Inmatningsfältet är fastnitat överst** — det du skriver i får aldrig glida iväg.
2. **De första träffarna ligger i bandet** mellan fältet och tangentbordet, så man kan
   välja utan att först stänga ner det.
3. **Scrollytan har bottenutrymme motsvarande tangentbordet**, så sista raden går att
   rulla upp i det synliga bandet. Utan det är sista alternativet oåtkomligt — och
   *det* vore ett fel.

### Omöjliga val listas inte
Det som inte går att välja ska inte gå att peka på: en puck kan inte bli sin egen
etapp, inte hamna i sitt eget barn, inte blockeras av något den redan blockeras av.
Filtrera bort före, i stället för att vägra efteråt med en röd toast.

## Levererat

**`openSurface()` är primitiven.** Den tar innehållet och väljer skalet: ankrad
popover ≥640, bottom sheet under. Alla ytor går genom den nu — status/priority/agent,
puck-väljaren, labels, filterpanelen, Display-menyn, datepickern och det lilla
enfältsformuläret. `.pop` och `.sheet` äger position, bakgrund och skugga; varje
picker bidrar bara med sitt innehålls-CSS.

**`window.prompt` finns inte längre någonstans i tavlan.** Issue och "namnge vy"
flyttade till `inputSurface()`, Target fick en riktig datepicker, Labels och Etapp
fick väljare. Sviten `saved.mjs` stubbar inte längre `prompt` — den **kastar** om
något kallar den.

**Datepicker: fält och rutnät, kopplade åt båda håll.** Skriv `2026-09` och
kalendern bläddrar dit; skriv ett fullt datum och dagen tänds. Plus "This month"
(månadens sista dag) och Clear. Inget spann, ingen tid, ingen påminnelse.

**Labels visar regeln i praktiken.** Öppen mängd → "Create #ny-label" ligger överst
när det du skrivit inte finns. Status och priority har medvetet ingen sådan rad.
Valen ligger som tokens *inuti* sökfältet, och skrivningen väntar till stängning:
tre labels blir ett commit, inte tre.

**Token-i-fält på referensfälten.** `Etapp` bär en token (etappens titel med
repo-prick), `Blocked by` en per blockerare — alla med eget ✕ som skriver direkt.
Den separata "No etapp"-raden i listan försvann: token-✕:et *är* vägen ut, och en
trasig referens syns som en token stavad precis som den skrevs, vilket är det som
gör den borttagbar.

**Sheeten går att dra, och följer fingret hela vägen.** Uppåt **växer** den —
bottenkanten står still och överkanten stiger, vilket är vad en sheet som expanderar
ser ut som. Att växa (höjd) i stället för att flytta (transform) är hela poängen: en
flyttad sheet lämnar en glipa under sig och visar samma innehåll förskjutet, medan en
högre faktiskt avslöjar mer av listan — det man drog upp för att se.

Nedåt kan den inte krympa under sin naturliga höjd, så där övergår gesten i att glida
bort; från full krymper den alltså först och glider sedan. Släpp förbi ~96 px stänger,
annars sätter den sig i det närmaste läget — en dragning som kommit nästan hela vägen
gör klart resan i stället för att fjädra tillbaka.

Handtaget är greppet, men hela chromet lyssnar; från listan tar dragningen bara över
när listan redan ligger i topp och fingret går nedåt — annars är gesten en scroll och
att stjäla den vore fel.

**Sidan bakom är inert.** `body` pinnas på sin plats (`position: fixed` med negativ
`top`) medan en sheet är uppe och läggs tillbaka efteråt; `overflow: hidden` räcker
inte på iOS. Räknat, eftersom en sheet kan öppnas ovanpå puck-modalen. Scrimen tar
`touch-action: none` och listan `overscroll-behavior: contain`, så inget rinner ut
till sidan under.

### Buggar som bygget tvingade fram
- **Tangentbordspaddingen sattes vid fokus på vad som helst.** Att trycka på en rad
  gav den fokus, sheeten växte — och eftersom en sheet är förankrad i underkanten
  flyttades varje rad uppåt mitt i tryckningen, så den landade på raden ovanför.
  Bara textfält reser ett tangentbord, alltså bara de padd*ar* nu. Hittad av
  mobilsviten, inte av mig.
- **Varje label-toggle committade** → detaljvyn ritades om → ytan revs bort mitt i
  redigeringen. Därav att skrivningen väntar till stängning.
- **iOS zoomade in vid fokus.** `.fp-search` var 13px, och Safari zoomar hela sidan
  när ett fokuserat fält är under 16px — utan väg tillbaka annat än att nypa. Alla
  textkontroller är 16px på mobil nu; testet mäter varje fält en yta kan fokusera.
  Rapporterad av dig, inte hittad av mig.
- **Sheeten krympte mitt i dragningen.** Att ta tag i handtaget flyttar fokus från
  sökfältet → `kb`-paddingen försvann → en innehållsstyrd sheet blev en tredjedel
  kortare *under fingret*, och pointern hamnade på scrimen. Höjden pinnas nu från
  första beröringen och släpps först efter att klicket hunnit avgöras — släpptes den
  direkt flyttade sig raden mellan pointerup och click i stället.
- **Ett klick som avslutade en dragning lästes som "utanför".** Klickets mål blir
  gemensam förfader till mousedown och mouseup — dvs `body` när fingret rört sig långt.
  Regeln är nu att ett klick som *började* inuti ytan aldrig är ett utanför-klick,
  vilket också täcker textmarkering som drar ut ur en popover.
- **Pointer capture retargetar även mus-eventen.** Att fånga vid varje pointerdown
  gjorde att ett tryck på en rad löste sitt klick mot sheeten i stället för raden, så
  radens handler aldrig kördes. Nu fångas bara gester som börjar på chromet.
- **Escape-hanteraren tog bort `.pick-menu`-noden direkt.** Med sheets hade det
  lämnat kvar scrimen och låst sidan. Den grenen är borta; `openSurface` stänger sig
  själv i capture-fasen och stoppar eventet där.

- **Två rättningar födde varsin bugg — båda av samma sort.** Regeln "ett klick som
  började inuti är aldrig ett utanför-klick" gjorde också triggern till *inuti*, så
  issue-editorn kunde inte längre stängas med sin egen knapp: ett andra klick
  staplade en ny ovanpå. Varje trigger håller nu sitt handtag och växlar mot det.
  Och regeln "rita inte om pucken medan en yta är uppe" sköt upp skrivningen utan att
  minnas *vems* den var — gick man vidare till nästa puck drog den uppskjutna
  skrivningen tillbaka den förra, hash och allt. En uppskjuten uppdatering gäller nu
  bara den puck som fortfarande visas.

- **Escape-företrädet gällde bara paletten.** Genvägshjälpen (`?`) är också ett
  lager ovanpå, och där tog ytans capture-hanterare Escape först: pickern under
  försvann medan hjälpen stod kvar. Ordningen är nu densamma överallt —
  hjälp → palett → yta → puck.

- **Städningen låg i dörrarna, inte i utgången.** `closeSurfaces()` satt i
  `openDetail`/`goToView` — men paletten når brädet på fler vägar än så: en
  etikettförslag filtrerar på plats via `exitPuckView` + `toggleFilterValue` och
  passerar ingen av dem. Sheeten blev kvar över det filtrerade brädet med sidan
  fortfarande scroll-låst. Nu ligger städningen i `closeDetail()` — den enda
  utgången ur en puck — plus i varje palettval.

- **Scrimen stoppar pekaren, inte tangentbordet.** Sheeten såg modal ut men var det
  inte: Tab (eller ett switch-reglage, eller en skärmläsare) gick rakt ut i brädet
  bakom, där man kunde aktivera saker man inte såg. Appen bakom är `inert` nu, Tab
  vänder i sheeten, och fokus lämnas tillbaka till knappen som öppnade den. Sheeten
  är `role="dialog"` + `aria-modal`, och tar fokus själv vid öppning — aldrig ett
  textfält, det hade rest tangentbordet ohyfsat.

- **Väljaren reste tangentbordet vid öppning.** `puckPicker` fokuserade sitt sökfält
  ovillkorligt, så på mobil kom tangentbordet upp direkt och begravde listan man
  skulle välja ur (label-väljaren hade redan rätt vakt; det hade inte den här, och
  inte heller raden-vald-vägen). Undantaget är enfältsredigeraren: där *är* fältet
  innehållet, det finns ingen lista att skymma, och den kom upp redo att skriva
  redan när den var en `window.prompt`.
- **Ingenting ägde Escape ovanför en yta — inte ens panelerna själva.** `C` öppnar
  New puck ovanpå en öppen picker; Escape stängde då den dolda pickern. Och när
  ytan väl backade undan föll trycket vidare till puckens egen hanterare och stängde
  *pucken* bakom den öppna panelen. Panelerna äger Escape nu (en delad
  `panelCloser`), och de stänger ytor när de öppnas. Ordningen är
  hjälp → palett → panel → yta → puck.

Två testförutsättningar föll med det här: dragtesterna mätte en sheet som redan
öppnade med tangentbordspaddingen på, så detenterna låg annorlunda. De drar längre
nu, och regeln är skriven som den faktiskt gäller — sheeten *krymper* inte för
tangentbordet; den får växa, annars hade den legat helt bakom det.

- **Panelerna kunde stapla på varandra.** Paletten gick att slå upp ovanpå en panel,
  och dess egna kommandon öppnar paneler. Två samtidiga paneler gör två saker fel på
  en gång: `modal-open` är en enda boolean, så att stänga den övre med knappen släckte
  klassen medan den undre stod kvar — och ett Escape tog båda, eftersom
  `stopPropagation` inte stoppar en syskonlyssnare på samma nod. Billigare att göra
  stapling omöjlig än att göra den korrekt: ⌘K gör ingenting över en panel, och
  `panelCloser` stänger en föregående panel innan den öppnar nästa.

- **En panels asynkrona arbete överlever panelen.** Settings kan bli klar med sitt
  sparande långt efter att man stängt den och öppnat något annat — och den gamla
  återuppringningen lämnade då tillbaka `modal-open`, som den nya panelen numera
  ägde. Stängningen är idempotent nu och släpper delat tillstånd bara så länge den
  fortfarande äger det.
- **"Gör ingenting" måste betyda ingenting.** ⌘K över en panel returnerade utan
  `preventDefault`, så Chrome tog tangenten till adressfältet och drog fokus ut ur
  modalen.

- **Fällan räknade sheeten som en av sina egna rader.** Sheeten håller fokus direkt
  efter öppning, och `root.contains(root)` är sant — så första Shift+Tab tog sig ut
  bakvägen (framåt landade rätt av en slump, eftersom behållaren ligger före sina barn
  i tab-ordningen). Behållaren räknas som *utanför* cykeln nu.

- **Fällan gällde även när något låg ovanför.** Escape-vakten hade lärt sig att
  backa för hjälpen, paletten och panelerna; Tab hade inte. Från paletten läser fokus
  som "utanför", så fällan drog tillbaka det ner i sheeten under. Samma vakt gäller
  båda tangenterna nu. Genvägshjälpen tog dessutom aldrig fokus när den öppnades —
  den låg bara visuellt överst — så den är `role="dialog"` och tar tangentbordet
  som paletten gör.
- **Fokus lämnades tillbaka till något som var på väg bort.** Back stänger ytorna
  *och* pucken; att ge fokus till knappen inuti den panel som strax döljs strandar
  det. Återlämningen är uppskjuten ett varv och sker bara till något som fortfarande
  syns — och bara om ingen annan hunnit ta fokus.

- **En regel i stället för en fälla per lager.** Att låta sheetens fälla stå ner
  för paletten löste bara halva saken: paletten och hjälpen fångar inte sitt eget
  fokus, så Tab förbi sökfältet vandrade ner i sheetens kontroller bakom dem. I
  stället för tre kopior av samma fälla finns nu en lagerstack: **det översta lagret
  är levande, allt annat på `<body>` är inert.** Ett lager namnger vad som ska förbli
  levande — en sheet behåller sin scrim, så tryck-utanför fortfarande stänger.
  `inert` spärrar pekare, Tab *och* skärmläsare på en gång, och en femte lager-typ
  ärver regeln utan att någon behöver komma ihåg den.

- **Luft under sökfältet, och ingen autofokus alls på mobil.** Två önskemål från
  dig efter att ha kört den mot Notion. Luften måste tillhöra det *fastnitade*
  fältet, inte ligga mellan fältet och listan — en marginal där målas inte, så
  rader hade skrollat genom glappet i stället för under det. Fältet ligger i en
  `.sheet-pin`-wrapper som bär paddingen (ett `<input>` kan inte bära den själv;
  `padding-bottom` flyttar dess egen text i stället för att lägga till utrymme
  under). Undantaget för enfältsredigeraren är borta: en sheet öppnar aldrig med
  tangentbordet uppe, oavsett vilken yta det gäller. På desktop fokuseras fältet
  som förut.

- **Rader lyste igenom ovanför det fastnitade fältet.** `-webkit-overflow-scrolling:
  touch` sätter iOS i sitt gamla scrolläge, där ett `position: sticky`-barn tappar
  fästet under momentum: listan fortsätter röra sig medan fältet släpar en bildruta
  efter, och raderna ritas *ovanför* det. Momentum är standard sedan iOS 13 och
  egenskapen är deprecated — det enda den fortfarande köper är den buggen. Borta.
  (Reproducerades inte i vår headless-motor, där egenskapen är en no-op.)

- **Egenskapsskenan i sektioner, och ett mål per rad.** Tretton rader med en hårfin
  linje mellan varenda en gav alla samma vikt — ingenting gick att skumma. Nu fyra
  grupper längs modellens egna leder (de tre axlarna · routing · referenser · den
  öppna värdemängden), utan linjer inuti en grupp. Tre följdbeslut föll ut av det:
  **carets bort** (chippen *är* kontrollen; en caret hjälper bara där hover finns,
  alltså ingenstans på mobil — så formen måste bära det, och ett tomt värde ritas
  som chip), **värde-plus-länk bort** (`No etapp` + `Set etapp`, `No target` +
  `Set target`, `Nothing` + `Add` var två träffytor för en sak; satt relation =
  namnet navigerar och `⋯` redigerar), och **Created/Updated som fotnot** i stället
  för två tabellrader — de är härledda, aldrig redigerbara, och Activity är samma
  faktum med mer detalj. Utan skrivrätt står exakt datum kvar i Target-raden: då
  finns ingen väljare att öppna det i.

Verifierat: 109 fall i `surface.mjs` över **båda** viewporterna (390×844 och
1280×900), plus åtta tidigare sviter som regression.

### Efter #9 — fem fynd till
- **Ytorna hade inget namn.** Status/priority/agent skickade ingen `title`, så en
  skärmläsare hörde "dialog" och inget mer. De heter något nu.
- **Fokusfällan låg i sheeten, inte i lagret.** Där `inert` saknas får vi bara
  `aria-hidden`, som en skärmläsare respekterar men Tab inte — och paletten,
  hjälpen och panelerna hade ingen egen fälla. Fällan flyttade in i lagerstacken:
  en lyssnare för varje lager i stället för en i sheeten och noll i de andra.
- **Fältgenvägarna staplade ytor.** `S`/`P`/`A`/`L` med en yta uppe öppnade en till,
  och ett Escape tog båda. Spärrad — men bara för fältgenvägarna: `?` och paletten
  ska fortfarande gå att öppna ovanpå, vilket är hela poängen med lagerordningen.
- **Fastnitningen kördes en gång.** Filterpanelen ritar sin lista först och lägger
  in ett sökfält först när fältet har fler än åtta värden, så det fältet blev aldrig
  nitat. Nu bevakas kroppen: det som dyker upp överst nitas när det dyker upp — och
  tillbaka-knappen ovanför fältet följer med, annars skrollade den bort för sig.
- **Fokus efter en skrivning.** Att välja ett värde bygger om detaljvyn, så knappen
  vi kom ifrån är borttagen när återlämningen körs. Vi minns vilken *rad* det var
  och tar dess nya kontroll.

## Open questions
- **iOS flyttar den *visuella* vyn när tangentbordet öppnas.** Vårt scroll-lås
  (fixerad `body` på negativ offset) håller dokumentet, men iOS scrollar ändå fram
  det fokuserade fältet — och då följer sidan bakom med, eftersom det är hela den
  visuella vyn som flyttar sig, inte dokumentet. Att inte autofokusera tar bort
  fallet där det händer *oombett*; kvar är fallet när man själv trycker i fältet.
  Botemedlet vore att nita sheeten mot `visualViewport` (position, inte storlek —
  regeln om att den inte ska *storleksändras* står kvar). Det går inte att verifiera
  i den headless-motorn vi testar i, så det kräver en runda på riktig telefon.
- **Ska navigering flytta fokus till det man kom fram till?** Efter Back hamnar
  fokus på `<body>`, som i vilken SPA som helst — inte på brädet man ser. Ytan gör
  rätt (den lämnar inte tillbaka fokus till något som göms), men ingen tar över.
  Det är fokushantering för navigering i stort, inte en egenskap hos overlay-
  primitiven, så det hör hemma i en egen puck.
- **"Hela månaden" i datepickern?** `target` lagras exakt men *visas* grovt, och
  `roadmap target <slug> 2026-11` betyder "i slutet av november". En kalender som bara
  erbjuder dagar puttar mot en precision vi valt bort. Förslag: en "Hela månaden"-knapp
  i månadshuvudet som sätter sista dagen — ett lagrat format, grov avsikt med ett tryck.
- **Ska "Ny etapp «X»" skapa pucken direkt?** Det är den starkaste idén från
  referenserna, men skapandet är inte gratis hos oss: en fil, ett repo-val, en commit.
  Antingen bygger vi det med repot utskrivet i raden, eller så låter vi väljaren bara
  välja bland det som finns.
