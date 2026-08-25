---
title: "UI-primitiv och skalor"
status: now
tags: [ui, dx]
updated: 2026-08-25
created: 2026-08-23
order: 5
depends: [polering-av-egenskapsskenan]
parent: gui-hantverk
---

## Goal
Ett komponentspråk i stället för femton engångsklasser — så att nästa funktion
ärver konsekvensen i stället för att lägga till en variant till.

## Research
Mätt ur `styles.css`, inte tyckt:

- **16 olika `border-radius`** och **14 olika `font-size`**. Halvorna (`10.5`,
  `11.5`, `12.5`) är avslöjande: det är enskilda knuffar, inte en skala.
- **Två komponenter finns två gånger.** `.rollup` ≡ `.agent-badge` (identiska
  deklarationer, den ena har bara `cursor: help` extra) och `.pick-mi` ≡
  `.user-mi` (fs13 · p 7/9 · r6 · hover panel-2). `.suggest-item` är samma sak en
  tredje gång med p 8/10 och r7.
- **Sex uppsättningar för märkesfamiljen** — `status-pill`, `issue-state`,
  `rollup`, `tagpill`, `adapted-badge`, `token`. `status-pill` och `issue-state`
  är båda "ett statusord i sin egen färg", den ena kapsel och den andra rundad
  fyrkant.
- **Nio knappformer**, och två av dem — `.date-act` och `.focusbtn` — har olika
  storlek beroende på *var de sitter*, satt via förälderselektor. Storlek är en
  egenskap hos kontrollen, inte hos platsen.
- **Tre röda literaler** för två jobb: `#c0564f` på en länk och `#cc6149` på en
  menyrad, fyrtio rader isär, betyder samma sak.

Flikarna är däremot rätt: `.tab-btn` (understruken, innehåll) och `.focusbtn`
(fylld, navigation) *ska* skilja sig — det är två olika sorters val.

## Delivered
- **`[hidden]` betyder dold.** Webbläsarens regel är `[hidden] { display: none }`,
  som varje klass med `display` slår — så varje komponent som lägger ut sig själv
  fick bära sitt eget undantag, och **sjutton** gjorde det. Den artonde
  (`.side-section`) fick aldrig sitt, och `AGENTS`-rubriken stod kvar över en tom
  lista. En global regel ersätter alla sjutton, och nästa element kan inte glömma.
- **Siffran är vad klicket visar.** Ett repo-chip räknade källans *allt* medan ett
  klick går via `goToPlace` → All pucks, som döljer inbox och arkivet: "PIA 52"
  landade på sex kort. Platser räknas nu med samma fråga klicket tillämpar — samma
  regel som vyerna redan höll sig till. Detsamma för disciplinköerna: kön är levande
  arbete, inte historik.
- **Tre röda fick namn** — `--danger` (ett destruktivt *ord*), `--urgent`
  (prioritetsmärket) och `--danger-solid` (den enda fyllda ytan med vit text). De
  hade dessutom ingen mörk variant: en hårdkodad röd följer inte temat.

- **Två skalor i stället för trettio beslut.** Radien har fem steg (`--r-xs` … 
  `--r-pill`) och typen nio (`--fs-xs` … `--fs-4xl`). Varje literal i filen är
  borta utom tre som förtjänar att vara literaler: `50%` för prickar, sheetens
  `16px 16px 0 0`, och `0.92em` för kod inuti brödtext — den sista är ett
  *förhållande*, inte ett steg, och ska följa texten den sitter i.
  Sju storlekar försvann (`9`, `10.5`, `11.5`, `12.5`, `13.5`, `14.5`, `17`) och
  elva radier. Tre former som egentligen var piller — draghandtaget,
  prioritetsstaplarna och filterstrecket — hade små radier i stället för
  `--r-pill`; de säger vad de är nu.
  Ett värde är semantiskt och inte bara estetiskt: `--fs-2xl: 16px` är golvet iOS
  kräver för att inte zooma in ett fokuserat fält. Det står i kommentaren, för det
  är inte uppenbart av namnet.

- **`.row` — den enda valbara raden.** En väljarrad, en menyrad och ett sökförslag
  var tre klasser med samma jobb och tre uppsättningar siffror (7/9 · r6, 7/9 · r6,
  8/10 · r7). Nu en komponent; *var* raden sitter avgör bara storleken, vilket är
  precis vad sheetens tumstora override är. De gamla namnen står kvar i markup som
  krokar — samma princip som `data-field`: namnet koden hänger på ändras inte när
  utseendet flyttar.
- **`.badge` — en bas, sex delta.** `.rollup` och `.agent-badge` var byte-identiska;
  de sex delade en familj men hade tre radier, fyra typstorlekar och fyra paddings.
  Nu bär basen allt gemensamt och varje namn bara sin skillnad. En fälla på vägen:
  basen låg efter två av deltana i filen, så källordningen vann och `.tagpill` föll
  från 11 till 10px. Basen ligger först nu.
- **`.linklike` saknade bas.** Den fanns bara i tre *scopade* varianter, så en
  utanför dem — "Edit body" — ärvde webbläsarens egen knapptyp, 13.33px. Sidans
  enda storlek som kom från ingenstans. Hittad av testet som kräver att varje
  typstorlek i puckvyn ligger på stegen.

- **`.btn` — en bas, sju delta.** Sju klasser bar sju uppsättningar siffror för en
  familj. Nu bär basen radie, ramtjocklek och form; varje namn bara sin storlek och
  ton.
  **En rättelse till min egen genomlysning:** jag skrev att två knappar byter
  storlek beroende på var de sitter, och att det alltid är fel. Det stämde bara för
  den ena. `.datepop .date-act` ligger i `@media (max-width: 640px)` — det är
  tumstorlek på telefon, alltså samma regel som `.sheet .row` följer, och den är
  rätt. `.side-views .focusbtn` var den verkliga: en andra variant av en kontroll
  som bara har ett hem. Den är infälld i `.focusbtn` nu, för det *är* kontrollen.

- **En ⋯-meny vid flikarna, och en footer som slutade räkna.** Puckens sida hade en
  länkrad under brödtexten — `source ↗`, `Copy link`, `Delete` — alltså en
  destruktiv åtgärd i slutet av en skrollning, skild från två navigationslänkar
  bara av färg. De tre gör något med *filen*, inte med sidans innehåll, så de
  ligger i en ⋯-meny i flikstrippen nu, med radera under en linje. Skenan behåller
  varje fältredigering och `Edit body` stannar hos brödtexten.
  Två fynd på vägen: länkraden visade `Delete` även utan token, eftersom den
  grindade på `canWrite()` ensam — och det betyder "inte känt skrivskyddad", inte
  "får skriva"; nu samma grind som skenan (`ghToken() && native && canWrite`).
  Och `.btn--solid` var en hängande selektor med ett efterföljande komma, så den
  ärvde `.col-add`s regler (`opacity: 0`, full bredd). Ingen använde den; borta.
- **Footern hörde till tavlan.** Den doldes inte när en puck täckte brädet, så
  "1 of 145 shown" stod kvar och beskrev en vy läsaren hade lämnat. Vyns antal
  fanns redan på två ställen (vyhuvudet och sidomenyn) och footerns var det enda
  som kunde bli fel. Den säger härkomst nu — `145 pucks · generated <tid>` plus de
  tre maskinutgångarna — och göms på puckvyn.

- **⋯ fick dela-knappens form.** Den ritades först som `btn--quiet` — ingen
  fyllning, transparent ram, `--ink-3` — och var praktiskt taget osynlig: ingenting
  sa att den gick att trycka på, och två läsare i rad hittade inte `Delete` inuti
  den. Den bär nu `.btn`-basens fyllning, hårfina ram och radie, alltså exakt samma
  form som topbarens dela-knapp, för det *är* samma sorts sak: sidans enda kontroll
  som gör något med filen i stället för med ett fält. En aning mindre (28px mot
  38px), för den sitter bland flikarna och inte i chromet. Testet mäter formen mot
  dela-knappen i stället för mot literaler, så de kan inte glida isär.

- **Färgfrågan var felställd — svaret är bägge, efter en regel.** Frågan löd om
  `.badge`/`.btn` ska ta färgen som modifierare eller som `currentColor`. Den
  avgörs inte av komponenten utan av **var betydelsen bor**:
  - Bär märket sin egen betydelse → **modifierare**. Ett statuspill säger `NOW`
    oavsett vad det ligger i, så färgen hör till märket.
  - Ärver märket betydelse från sin rad → **`currentColor`**. Papperskorgsikonen i
    ⋯-menyn är röd för att *raden* är farlig, inte för att en soptunna är röd; en
    modifierare där hade dubblerat samma påstående på två ställen.
  Bägge fanns redan och bägge följer regeln. Det som saknades var regeln.

- **Fyra märken ur setet, och tre tecken som inte var märken.** Brödsmulans `›`,
  filterpanelens `›`/`‹` och tillbakalänkens `←` var *typografi*: de tog vikt och
  baslinje ur typsnittet i stället för ur ikonuppsättningen, så de matchade aldrig
  riktigt märkena bredvid sig — och `←` var dessutom en annan art än separatorerna
  den stod på rad med. Alla sex är nu `chev-right`/`chev-left` ur samma Feather-set
  som resten, och separatorn kommer ur **en** funktion (`sep()`) i stället för att
  vara kopierad till tre byggare.
  Storleken är däremot inte satt i px utan i `em`. Samma separator sitter i en
  11px-mono-smula och i en 14px-sans-smula; en fast 16px-ikon hade tornat över den
  ena och krympt mot den andra. Det var precis vad `›` gjorde rätt av sig själv, och
  det ikonen fick läras.
- **⋯ blev setets egen.** Den var handritad här — tre nollängdslinjer med runda
  ändar, samma knep som `list` använder för sina punkter — vilket gav rätt bild men
  min egen delning. Nu tre cirklar ur uppsättningen.
- **Bara Inbox bär en ikon, och det är poängen.** Den är den enda raden som är ett
  *rum* och inte en skiva av tavlan (den står i egen sektion ovanför `Views`), så
  den bär ett rums märke. Att ge alla sex en ikon hade sagt motsatsen — att de är
  sex av samma sort.

- **Tre märken till, och en fråga som var rätt ställd.** `chev-down`/`chev-up` bär
  de tre upplysningsklaffarna (`▾` i markupen tidigare), och vilken väg de pekar
  avgörs av knappens egen `aria-expanded` — ingen state att hålla synkad. De är
  satta i **px och inte `em`**, till skillnad från separatorerna: en klaff är en
  *affordans* som ska säga "det här öppnas" likadant bredvid ett 11px-arbetsytenamn
  och en 17px-vytitel, medan en separator är skiljetecken och ska följa texten den
  står i. Två regler, för att det är två olika jobb. `reset` (rotate-ccw) sitter på
  "Reset to default".
- **`0/5` bar fel märke.** Rollup-brickan räknar *puckar*, men bar etappmärket — så
  samma glyf stod två gånger på samma kort, och två prickar stod framför siffran 5.
  Den bär puckmärket nu; etappen bär sitt eget vid titeln.
- **Den kompletta rollupen var "inramad", inte "klar".** `.rollup.full` mörkade
  ramen med en `--done`-blandning. Men *alla* brickor har `1px solid var(--line)`,
  och i ljust läge ligger `--line` (#e6e2d9) ett hårstrå från fyllningen (#ebe8e1) —
  ramen är osynlig med flit och chippet läser som en yta. Alltså var det enda ögat
  fångade "den här har en ram och den där inte", ett faktum läsaren måste få
  betydelsen av berättad för sig. Regeln bakom: **ett tillstånd inuti en bricka byter
  dess färg, aldrig dess konstruktion.** `--done` är tavlans dämpande färg (2.9:1 mot
  fyllningen där `--ink-2` ger 4.7) — en färdig etapp drar sig tillbaka här precis som
  ett gjort kort gör överallt annars, och siffrorna bär resten.

- **Rubriken låg i sin egen scroller.** Sidomenyns arbetsytesrad bär kommentaren
  "samma fasta höjd som topbaren och toppställd mot vyn, så *Roadmap* + sök linjerar
  över sömmen". Påståendet höll bara vid scrollposition 0 och bara när listan fick
  plats — för raden ligger *inuti* `.sidebar`, som är `overflow-y: auto`, och den är
  dessutom ett flexobjekt. På en telefon svämmar lådans lista över (vyer + sparade +
  discipliner + sex repon), och då hände två saker samtidigt: raden **klämdes ihop**
  från 52 till 32px av flex-shrink, och minsta scroll bar den uppåt ur bandet. Mätt
  på gammal kod: mitten låg på 16 mot topbarens 26, och efter 200px scroll på −154.
  `flex: none` + `position: sticky` gör kommentaren sann. Testet mäter i en kort vy —
  där överflödet är garanterat — både före och efter en scroll, för det var precis
  den kombinationen som inte fanns i någon mätning tidigare.

- **`.segmented` — en kontroll, inte flera knappar bredvid varandra.** Layoutväxeln
  och temaväxeln hade samma jobb, samma klicka-och-måla-om-dans och två olika utseenden:
  den ena ritade en ram runt *varje* val, den andra ett fyllt spår med en upphöjd pill.
  Avslöjaren är ramen — **en ram per val läser som flera knappar som råkar ligga
  bredvid varandra, en ram runt gruppen som en kontroll med N lägen.** Bägge är det
  senare. Nu en builder (`segmented()`) och en komponent; `dp-seg`/`set-seg` står kvar
  i markup som krokar.
  Flikarna är fortfarande med flit inte detta: `Overview | Activity` byter vad sidan
  *visar*, alltså understruken. Det är den enda av de tre där valet byter ytan under.
- **`<select>` var 16px för att iOS kräver det, resten av sheeten 13.** Golvet är
  riktigt — Safari zoomar in sidan när ett fokuserat fält ligger under 16px — men det
  gjorde den enda kontrollen med ett golv till den enda stora saken på ytan. En sheet
  är en tumyta, och det styr dess *text* lika mycket som dess träffytor: raderna hade
  redan klivit upp till `--fs-xl`, etiketterna bredvid dem stod kvar på skrivbordets
  `--fs-md`. Ett steg för allihop, så ligger golvet en pixel bort i stället för tre.
- **En avdelare med luft bara ovanför.** De brädspecifika raderna byggs om i klump,
  så linjen som inleder dem måste ligga *inuti* gruppen — utanför skulle den bli kvar
  när gruppen töms. Men gruppen är en vanlig `<div>`, och ytan lägger sitt avstånd med
  `gap`, som en div inte för vidare: linjen satt dikt an mot första kryssrutan (10/2)
  medan tvillingen under höll 10/10. `gap: inherit` tar ytans eget avstånd i stället
  för att upprepa talet, så gruppen inte kan glida från ytan den sitter i.

- **Fällbara grupper i listvyn — och var läget bor.** Ett fällt läge är en
  *visningspreferens*, aldrig puck-sanning, så det går samma väg som `done` och
  `empty`: in i `state`, ut genom URL:en. Då blir det delbart och **sparbart som en
  vy** utan en rad ny maskin och utan en andra lagring. Nycklarna serialiseras
  sorterade och inte i klickordning, annars skulle två identiska vyer jämföra olika
  och URL:en skvalpa. Pricken på *Display* räknar dem, för annars hade "Reset to
  default" ändrat något pricken påstod var default.
  Bara listvyn. I brädvyn är kolumnrubriken redan släppyta och bär `+` — ett klick
  där betyder något annat. (Punkt tre i planen, "drag mot en fälld grupp fäller upp
  den", visade sig sakna föremål: listraderna är inte dragbara, `renderList` säger
  det själv — "a flat list has no drop targets".)
- **En rubrik som blev en knapp tappade sina versaler.** `font: inherit` täcker inte
  `text-transform` och `letter-spacing`, och webbläsarens egen regel *deklarerar* dem
  på `button` — en deklaration på elementet slår ett ärvt värde. Samma fälla som
  `.linklike` gick i med webbläsarens 13.33px. Knappen ligger dessutom *inuti* `h2`
  och inte tvärtom: `role="button"` på raden hade gjort innehållet presentationellt
  och tagit bort listans grupprubriker ur rubrikträdet.
  På vägen dit hittades en död selektor: `.list-head h3` fanns i mono-regeln men har
  aldrig funnits i markupen, så listans gruppetikett var den enda kolumnetiketten som
  aldrig fick mono.

- **Den sista OS-ritade ytan är borta — och med den 16px-golvet.** Tre native
  `<select>` fanns kvar: Grouping, Ordering och repo-väljaren i New puck. På iOS
  ritar de systemets egen hjulväljare, i sin egen form och sina egna färger — exakt
  det som gör att `window.prompt` inte används någonstans här. Och ett fokuserat
  native-fält drar med sig zoom-golvet: Safari zoomar in sidan när fältets typ ligger
  under 16px, och det var därför hela telefonarket bar det.
  Alternativen är sämre än golvet. `user-scalable=no` tar nyp-zoom från *alla* för att
  bespara ett fält; `transform: scale()` på ett 16px-fält låter elementets layoutruta
  ljuga om sin egen storlek — och just den lögnen har kostat den här filen två buggar
  (klippkanten som mätte rätt och målade fel, rubriken som klämdes ihop). Rätt svar är
  att inte ha ett native-fält. Alla tre går genom `openSurface()` nu, `selectEl()` är
  borta, och `select` står inte längre i golvregeln.
  Två saker föll ut av bytet. Väljaren håller sitt `current` från när den byggdes, så
  raden målar om sig efter ett val — annars hade chippet visat värdet man just lämnade.
  Och på telefon *är* väljaren arket: den tog Display-menyns plats, så menyn måste
  sättas tillbaka efteråt, annars hade en inställning kostat en omöppning och menyn
  håller fem. På bred skärm står menyn kvar och raden räcker.
  Optionsraderna bär `data-value` nu — optionens beständiga identitet, samma skäl som
  `data-field` finns: en krok som inte flyttar när formuleringen gör det. Fyra
  testställen drev den gamla `<select>` och läser den i stället.

- **Display-menyn fick filterpanelens navigering — den hade två.** Grouping och
  Ordering öppnade en *egen* väljaryta. På bred skärm blev det en andra popover och
  menyn stod kvar; på telefon tog väljaren arkets plats och lämnade **ingen väg
  tillbaka** — enda utgången var att stänga och börja om. En overlay-primitiv hade
  alltså vuxit två sätt att nå en underlista, och bara det ena gick att backa ur.
  Nu samma två nivåer som filterpanelen, i samma yta: raden visar sitt värde till
  höger med en chevron efter, `‹ Grouping` går tillbaka, och ett val landar på nivå 1
  i stället för att stänga menyn — en visningsinställning är sällan den enda man kom
  för, och menyn håller fem. Formen är iOS Inställningar rakt av, som du föreslog:
  namn, värde, pil.
  En detalj som var värd sin egen regel: `.fp-cur` tar `margin-left: auto` och
  chevronens egen måste ge vika. Två `auto`-marginaler **delar** ledigt utrymme, så
  värdet parkerade mitt i raden i stället för i dess ände.

- **Bocken ur setet, och platsernas chip borta.** `✓` var det sista typografiska
  tecknet som gjorde ett märkes jobb — sex ställen ritade det som text. Det är
  `check` ur samma Feather-set nu, satt i `em` som de andra märkena som sitter i en
  textrad: samma bock i en 13px-menyrad och en 15px-arkrad.
- **En plats är inget filter.** Chipraden är filtrets egen redovisning — den listar
  vad man har smalnat av med, och att den kan tömmas är hela dess poäng. Men ett repo
  eller en disciplinkö är något man *navigerat till*: sidomenyn markerar raden och
  titeln bär namnet, så `Repo: PIA ×` var ett tredje påstående om samma sak, formulerat
  som ett filter man glömt kvar. Borta. Vägen ut är vägen in — samma sidomenyrad igen,
  eller *All pucks* i titelväxlaren; mätt: ett andra klick släpper platsen och tömmer
  URL:en. `Clear all` släpper dem fortfarande, för den betyder "sätt tillbaka allt".
  Med chipet borta är `.fchip.place` och hela `place`-grenen i chip-byggaren död kod
  och tagen.

## Open questions
