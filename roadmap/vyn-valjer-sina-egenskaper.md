---
title: Vyn väljer sina egenskaper
status: now
tags: [ui, product]
updated: 2026-09-07
created: 2026-09-04
priority: high
target: 2026-09-30
owner: tor2dbear
agent: design
---

## Goal

Välja **vilka egenskaper som visas** — status, prioritet, agent, repo, ägare, skapad,
uppdaterad, target, etiketter, rollup — på korten och raderna *och i gruppernas
rubriker*, och att valet är en del av vyn: det ligger i URL:en, följer med en delad
länk och sparas med en sparad vy.

## Research

**Uppsättningen finns redan; det som saknas är valet.** Både kortet och listraden ritar
en fast uppsättning fält, och varje fält är redan sin egen vaktade rad — `if
(item.priority)`, `if (item.agent)`, `if (item.owner)`, `if (item.progress)`. Det är
alltså inte en omskrivning av renderarna utan en fråga till dem: *är det här fältet
påslaget i vyn?*

- **Listraden** är ett rutnät med fasta spår: `18px | namn | prioritet | agent | repo |
  datum`. Att stänga av ett fält är att ta bort både cellen och dess spår, annars står
  en tom kolumn kvar och håller sin bredd.
- **Kortet** lägger sina märken i en rad (`card-meta`) och behöver bara sluta lägga dit
  dem.
- **Gruppens rubrik hör hit lika mycket som raden.** Den bär två tal — `count`
  (antalet rader gruppen visar) och rollup-brickan (`progress`, delarna pucken *har*) —
  plus arkivmärket och swatchen. Rubriken är samma fråga en nivå upp.
- **Datumet är redan ett val, fast automatiskt.** `cardDateField()` väljer fält efter
  hur man sorterat: sorterar man på `created` visas `created`, på `target` visas
  `target`, annars `updated`. Regeln finns för att en lista som sorterats på ett datum
  och visat ett annat läste som blandad. Ett handval måste antingen ersätta den regeln
  eller ligga ovanpå den — och det är den enda riktiga designfrågan i pucken, inte det
  mekaniska.

**Var det bor är redan bestämt av två existerande beslut.**

1. **`VIEW_KEYS`** i `app.js` är de åtta nycklar en vy består av
   (`view, q, group, layout, sort, done, empty, collapsed`), samma nycklar i URL:en som
   i `views[]` i `board.config.json`. En nionde (`fields`) ärver därmed delbara länkar
   och sparade vyer gratis. `effectiveParams()` är den enda normaliseraren och är där
   ett fält som inte kan betyda något i den aktuella layouten ska falla bort — precis
   som `empty` gör utanför tavlan och `collapsed` utanför listan.
2. **Display-menyn** är redan hemmet för "hur mycket visas": layout, gruppering,
   ordning, `Show done & cancelled`, `Show empty columns`. En rad till, med en
   undermeny av kryssrutor, är den formen menyn redan har (`DISPLAY_FIELDS` →
   `renderDisplayValues`).

**Det finns redan ett automatiskt val att inte bryta** — och det är avgjort tvärtemot
hur den här texten först löd. Se *Beslut* nedan.

## De två talen i rubriken säger olika saker, utom när de inte gör det

`count` är **hur många rader gruppen visar just nu**; rollup-brickan är **hur många
delar pucken har**, ofiltrerat. Utan filter är de samma tal, och det är exakt då de ser
ut som en dubblering: `Brand it + split product / instance 2 ⚬2/2`. Med ett filter går
de isär, och då är bägge värdefulla.

Det gör dem till ett bra första par att kunna välja mellan — och det är samma
resonemang som redan avgjorde att *raden* inte bär någon räknare: `progress` svarar på
den stadigare frågan, medan ett antal rör sig med filtret. Skillnaden är att rubriken
har plats för bägge, så där är det ett val och inte ett avgörande.

## Vad som gör den värd hög prio

Tavlan har fått fler egenskaper än en rad rymmer: prioritet, agent, ägare, target,
rollup, blockerare, flaggor, etiketter. På 390px trängs de redan om titeln — det var
precis vad `1 archived part`-märket gjorde med `Nästling…` i nästlingsarbetet, och
lösningen där var att flytta *en* sak till en egen rad. Det är en lokal räddning av ett
generellt problem: uppsättningen är inte densamma för en fleet-vy som för en
prioriteringsgenomgång.

## Beslut

**Automatik gäller i frånvaro av ett val, aldrig över ett.** Det är den ena regeln
bägge besluten nedan följer, och den finns för att en tyst överkörning är samma fel
filen redan namnger två gånger: en kontroll som påstår ett val som aldrig trädde i kraft.

**Ett tomt val är ett val.** Automatiken gäller när `fields` *saknas*, inte när det finns
och råkar sakna datum: kryssar man medvetet bort alla tre ska raden visa inget datum alls,
annars går det inte att stänga av dem — och en sparad vy vars tomma val serialiseras som
ett utelämnat `fields` skulle dessutom ändra sig vid omladdning. Alltså: skilj *frånvaro
av inställning* från *inställning med tom delmängd*.

**Två datum samtidigt kräver etiketter.** `dateCell()` skickar bägge genom `dateEl()`,
som skriver ut den råa datumsträngen och hårdkodar både sin tooltip och sitt
tillgänglighetsnamn till "Last updated". Kryssar man i `Created` och `Updated` blir det
alltså två omärkta datum, varav det ena dessutom *läses upp fel* — och då är hela
poängen (att kunna se varför ordningen är som den är) borta. Fältnamn per datum är en
del av leveransen, inte en efterrätt.

**Datumet: valet ersätter `cardDateField()`.** `Created`, `Updated` och `Target` blir
tre separata val, och dagens regel — visa det datum sorteringen handlar om — blir
*defaultuppsättningen* när inget datum är valt. Kollisionen som tvingade fram frågan:
sorterar du på "Newest created" och har kryssat `Updated` visar raderna
uppdateringsdatum medan ordningen följer skapandedatum, vilket läser som en oordnad
lista — precis felet regeln skrevs för att förhindra. Med valet som överordnat kan du
kryssa i bägge och se varför ordningen är som den är.

**Bredden: raden får scrolla i sidled i stället för att tappa kolumner.** Mätt på 390px
med hela uppsättningen påslagen: sidbredden står stilla (390), lådan scrollar internt
(926), och med `position: sticky; left: 0` på glyf + namn står titeln kvar efter 260px
sidled, oklippt. Rubriken måste frysas i sidled på samma sätt, annars scrollar den ut
åt vänster.

Priset är **en** sak, och bara en: `overflow-x: auto` gör lådan till scrollcontainer i
båda axlarna, så gruppubrikens `top: sticky` upphör att gälla. Den kostnaden var i
första bedömningen felprissatt som ett skalbygge — slutsatsen "alltså måste sidans
scroll flytta in i en ruta" förutsätter att den klibbiga rubriken är värd priset, och
Notion har den inte på telefon. Skalbygget står kvar som en möjlighet om rubriken visar
sig saknas, och hör då ihop med `headern-malas-inte-vid-omladdning`, som rör samma
geometri.

Vinsten utöver löftet: **hela brytpunktsräkningen kan gå.** 560/720, sedan 652/812 när
indraget skulle in — två buggar på två dagar kom ur de talen. En rad som får scrolla
behöver ingen veta vad som får plats.

## Byggt: bredden först, väljaren står kvar

Sidledsscrollen ligger i koden före själva väljaren, för den är förutsättningen: en
uppsättning man valt går inte att lova om raden fortfarande droppar kolumner. Nu behåller
raden varje kolumn och lådan scrollar, med glyf, karet och namn frysta vid vänsterkanten
och gruppens rubrik fryst i sidled.

Fyra saker som inte var uppenbara, och som var och en tog en mätning:

- **En sticky-box kan inte förskjutas inuti ett containing block den fyller helt.** En
  rubrik i full bredd gled därför bara ut åt vänster (−376px vid scrollLeft 400).
  Rubriken är nu två lådor: en yttre som spänner gruppen och en inre, `width: max-content`,
  som har rum att fästa i.
- **Grupperna måste dela bredd.** Som egna block var en arkivstump bara så bred som sin
  rubrik och åkte ur bild helt när listan scrollades. Tavlan lägger dem i *ett* rutnät
  med en kolumn — `minmax(max-content, 1fr)` — som alla sträcks till.
- **Karetet hörde till namnet, inte till raden.** Som barn till raden hängde det kvar hos
  ett förfaderselement medan titeln frös; mätt som ett avstånd som ändrades, 88px → 62px.
- **Tavlans 24px marginal läckte.** En fryst cell täcker bara sin egen låda, så den
  scrollade metadatan syntes till vänster om glyfen. Bakgrunden blöder över rännan med
  `background: inherit`, så den följer hover och markering utan en andra plats att
  uppdatera.

Och det som gick: `@container`-nivåerna, alltså 560/720 och 652/812. En rad som får
scrolla behöver ingen veta vad som får plats.

## Priset återköpt: skalet är en fast höjd

Rubriken följer med nedåt igen. Skalet är en fast höjd med `.work` som enda scrollruta,
alltså det bygget som stod som "går att ångra" här — och det visade sig vara mindre än
befarat, för sidan hade redan lämnat sin scroll till `.app`s `min-height`.

- **Två sticky-lådor, en per axel.** En sticky-box kan bara röra sig inuti sitt containing
  block: vertikalt behövs ett element kortare än sin behållare (`.list-head` i den höga
  gruppen), horisontellt ett smalare (`.lh-inner` i den fullbreda rubriken). Bara den inre
  gav sidled och −469px nedåt.
- **Rubriken över de frysta cellerna** (z-index 4 mot 2): på samma nivå målade den
  scrollade radens titel över den fastnaglade rubriken.
- **Låset flyttade med scrollen.** `body { position: fixed }` höll sidans offset; sidan
  har ingen nu, så `lockScroll` gömmer rutans överflöd och lägger tillbaka dess offset.
- **`100dvh` tar spökskrollen på köpet** — kandidat 1 i `headern-malas-inte-vid-omladdning`
  är därmed prövad utan att den pucken rörts.
- **Höjden hör hemma på `body`, inte på `.app`.** Skalet är inte alltid ensamt på sidan:
  den config-styrda banderollen sätts in som syskon. Mätt: 38px banderoll i ett 420px
  fönster gav 458px dokument — sidscroll igen, och en sida som kan röra sig medan en sheet
  låser bara rutan. Som kolumn tar banderollen sitt och `flex: 1` ger skalet resten.

## Fryst är orörligt, inte "fastnar till slut"

Rättelse av raden ovan: *"Karetet hörde till namnet"* löste var frysningen satt, men inte
**när** den inträffade. Med `left: 0` frös cellen först sedan den glidit fram till rutans
kant. Mätt på 390px: glyfen 36px, titeln 50px, gruppens rubrik 26px — alltså rörde sig
allt på skärmen under den första biten av varje dragning i sidled, och en dragning nedåt
med minsta sidodrift gjorde det också, eftersom en ruta som scrollar i båda axlarna
panorerar diagonalt. Rapporten löd "det skrollar i alla led", vilket var precis vad den
gjorde.

Offseten är nu viloläget — tavlans ränna plus radens padding, plus glyfspåret och ett
mellanrum för namnet — så vägen är noll. Två följder:

- **Talen blev tokens.** `--list-pad`, `--row-pad`, `--glyph-w`, `--row-gap`, `--head-pad`.
  Ett mellanrum som breddas i rutnätet men inte i offseten *är* det glapp som just togs
  bort, och det är den sortens skillnad ingen ser förrän någon drar i listan på en telefon.
- **Rännan täcks per låda.** Glyfen och rubriken fäster på olika x, så de kan inte längre
  dela en `::before` med en bredd: två regler, två bredder.

Vad som står kvar: rutan panorerar fortfarande diagonalt, för en enda scrollruta i båda
axlarna är priset för den klibbiga rubriken. Skillnaden är att det som glider nu är bara
metadatan till höger. Den riktiga kuren är den här pucken själv — en telefonvy med färre
kolumner har ingen sidled att scrolla i (mätt i fixturen: 352px överskott med hela
uppsättningen påslagen).

## Frysningen togs bort: den tog skärmen, och den läckte

Mätt på den riktiga tavlan, 390px, med glyf och namn frysta:

| | fryst block | kvar att scrolla i |
|---|---|---|
| `group=status` | 288px | 102px (26%) |
| `group=parent` (med indrag) | **368px** | **22px (6%)** |

En fryst kolumn som lämnar 6% av skärmen håller inte din plats, den tar skärmen. Och
läckan som rapporterades i samma andetag var strukturell, inte en glömd bakgrund: **två
frysta celler med ett rutnätsglapp mellan sig är två ogenomskinliga lådor och ett
14px-fack som tillhör ingen.** Prioritetsstaplar och agentbrickor gled igenom det och la
sig bredvid glyfen. En enda fryst låda hade löst läckan — och inte de 22 pixlarna.

Alltså scrollar hela raden, titeln med. Gruppens rubrik står kvar i bägge axlarna: den
namnger gruppen man är i, en rad per grupp i stället för en per rad, och som *en* låda har
den inget glapp att läcka genom.

Det bekräftar pucken snarare än att göra den mindre nödvändig: det som gjorde blocket
368px brett var att alla sex kolumnerna alltid är på. Med ett val per vy finns det
ingenting att scrolla till på en telefon, och då kan frysningen prövas igen om den saknas.

## En dragning håller sig till en axel

Det som stod kvar efter avfrysningen: rutan panorerar diagonalt, för en enda scrollruta i
båda axlarna är priset för den klibbiga rubriken. **Det finns ingen CSS för det.** Tre
saker som ser ut att vara svaret och inte är det:

- `touch-action: pan-x|pan-y` binder ett element till *en* axel för gott, inte per gest —
  raden hade aldrig gått att scrolla nedåt igen.
- `overscroll-behavior` talar om kedjning, inte riktning.
- Två nästlade enaxliga rutor gör det inte heller: en låda som inte kan scrolla vertikalt
  kedjar den vertikala delen rakt till sin förälder, så en diagonal dragning rör bägge ändå.

**Första svaret var fel, och felet är det som är värt att spara.** Det läste den scroll
webbläsaren redan gjort och la tillbaka off-axeln. Det passerade ett syntetiskt test och
gjorde ingenting på en riktig telefon: *en iOS-touchscroll körs på kompositorn, och att
skriva `scrollTop` medan fingret är nere når inte dit.* Ett test som flyttar offseten själv
rör aldrig den mekanismen — det mätte aritmetiken, inte saken.

Så webbläsaren får veta i förväg i stället. `touch-action: pan-y pinch-zoom` på rutan
(bara i listan — kanban-tavlan är sin egen sidledsscroller, och `pan-y` på en förfader
förbjuder den) gör att en dragning *inte kan* panorera den i sidled hur sne den än är.
Sidled är sedan vår att driva: de första 8 pixlarna väljer axel, och en sidledsgest nekar
webbläsarens vertikala panorering och flyttar `scrollLeft` med fingrets eget delta.

Priset, och det är den ärliga halvan: en sidledsflick har inget momentum, för det är inte
webbläsaren som scrollar. Vertikalt behåller allt — momentum, gummibandet — vilket är den
axel en lång lista faktiskt läses i.

**Vinkeln i kontrollen är vald, inte gissad.** Chromium har ett eget axellås som håller upp
till ungefär 36 grader, så en svag drift skulle passera även utan regeln. Vid 42 grader
släpper det och tar hela sidledsvidden med sig — 352 av 352 — och det är talet sabotaget
lämnar efter sig. iOS låser inte alls. Refuseringen av den vertikala panoreringen går av
samma skäl bara att se som `defaultPrevented`, aldrig som en offset.

## Kvitto från telefonen: kastet och indikatorerna

Låset fungerar, och det som återstod var fyra symptom med två orsaker.

**Sidleds kändes stum**, och det var priset som inte var betalt: `touch-action: pan-y` ger
bort webbläsarens sidledsscroll, alltså också dess momentum. 1:1 med fingret och tvärstopp
när det lyfts är inte hur någon annan scroll på telefonen beter sig. Så ett eget kast:
utjämnad hastighet (en enda hackig bildruta i slutet av en svep får inte avgöra hela
glidet) som dämpas per *millisekund*, så en långsam bildruta inte köper extra väg. Mätt:
snabb flick 200 → 352, långsam dragning 200 → 200. En dragning som stannat innan fingret
lyfts kastas inte alls — utan den vakten går den långsamma till 271. Och en gest som
*tas* ifrån oss kastas inte heller: `touchcancel` — ett samtal, ett kantsvep, en scroll
webbläsaren bestämde sig för att äga — låg på samma väg som ett lyft finger och glidde
alltså lika långt som ett svep användaren aldrig slutförde (100 → 174 mot 100 → 100).
Arket en våning ned gör tvärtom, med rätta: där finns ingen tröghet att sjösätta, bara
ett drag som måste landa.

**Och kvittot för det fångade klicket höll bara för ett klick som var på väg.** Fångar man
ett glid och sedan *drar*, kommer inget syntetiskt klick — flaggan låg kvar och åt nästa
riktiga tryck i stället. Det gick inte att se med beröringar, för nästa tapp är en beröring
och dess egen `touchstart` nollar flaggan på vägen in; en mus på en hybrid, eller ett klick
från hjälpmedel, kommer utan `touchstart` alls. Mätt: rent musklick öppnar pucken, samma
klick efter en fångad-och-dragen gest gjorde det inte.

Fyndet avslöjade något värre än sig självt: **den befintliga kontrollen för samma gest var
grön mot vilket sabotage som helst.** Listan stod vid högerkanten när den kördes (352 av
352), och där ber fingret om ett håll som inte finns — alltså inget glid, ingen fångst,
inget påstående. Nu nollställs offseten först och kontrollen kollar att det *finns* ett glid
att fånga. En kontroll som inte kan falla är samma sorts fel som kod inget sabotage kan
fälla; den här filen letar redan efter det ena och missade det andra i sin egen svit.

**De tre andra var samma sak: en tvåaxlig ruta ritar två indikatorer dåligt.** Den lodräta
målas *under* de klibbiga gruppubrikerna, den följer med i sidled i stället för att stå vid
rutans kant, och en flick nedåt blinkar fram den vågräta också — en indikator för en axel
webbläsaren inte ens scrollar. Dolda under `(pointer: coarse)` och bara i listan: på en
dator är stapeln hur man lär sig att listan går i sidled alls, och där är den inte
flyktig.

## Byggt: väljaren

`props` är den nionde vy-nyckeln, så valet ligger i URL:en, följer med en delad länk och
sparas med en sparad vy — utan något eget maskineri, vilket är precis vad `VIEW_KEYS`
fanns till för. `PROPS` är katalogen och driver raden, kortet **och** gruppens rubrik ur en
vandring.

Fyra saker som var mekaniska på papperet och inte i verkligheten:

- **`FIELDS` var upptaget.** Frågespråkets fälttabell har hetat så sedan filtret skrevs, och
  min redeklaration tömde den: inget term matchade, tolv kontroller föll — och ingenting
  kastade. Egenskaperna heter `PROPS` och nyckeln `props`, så "fält" betyder en sak i filen.
- **Om cellen finns är en fråga om vyn, aldrig om pucken.** Tomheten är per puck, så en puck
  utan target som hoppade över sin datumcell flyttade varje cell efter den ett spår åt
  vänster. En puck utan target hade alltså spräckt registret för hela listan.
- **Datumspåret växer med det den håller.** Hittat genom att titta på en telefon: med
  `Created` och `Updated` ibockade är cellen högerställd, så ett fast 92px-spår — måttat för
  ett naket datum — rann över *åt vänster* och skrev bägge datumen ovanpå repo-namnet
  (mätt på 390px: första datumet började på 320, repo-cellen slutade på 450). Inte
  `max-content`: varje rad är sitt eget rutnät, så ett innehållsmätt spår blir olika brett på
  varje rad och kolumnen slutar vara en kolumn.
- **Ägare och etiketter fanns bara på kortet.** De finns på raden nu, för annars ljuger
  kryssrutan i listläget — samma fel som filen redan namnger tre gånger: en kontroll som
  påstår ett val som aldrig trädde i kraft.

## Frågorna, besvarade

- **Ett val eller ett per layout?** *Ett.* Argumentet för två var att raden är trängre än
  kortet — och sidledsscrollen tog bort just den skillnaden innan väljaren byggdes. Kvar
  blir "två saker att spara", vilket aldrig var argumentet *för*.
- **Delar rubriken radens uppsättning?** *Ja, och `rollup` är skälet.* Brickan bredvid en
  grupps namn och brickan på en rad är **samma egenskap**. Två uppsättningar hade fått
  namnge den två gånger och kunnat säga emot varandra om raderna nedanför. `count` finns
  bara i rubriken, och det är ingen invändning: `parent` säger ingenting under
  parent-gruppering och `repo` ingenting under repo-gruppering.
- **Vad kan aldrig stängas av?** Titeln, puck-glyfen och rubrikens swatch (bägge bär
  repofärgen), ⚠, och arkivmärket. De två sista är samma regel från var sitt håll: en
  driftsignal man kan gömma är ett fel man kan gömma, och märket är det enda klicket
  tillbaka till korten det håller.
- **Filter eller display?** Display, som förutspått — men gränsen visade sig ha en tredje
  sida: `props=none` är ett val, inte frånvaron av ett. Automatiken gäller när nyckeln
  *saknas*. En tom sträng kan inte bära det, för `viewsEqual` läser `(a[k] || "")` och ser
  då ingen skillnad mot en saknad nyckel — därför den literala `none`.

## Status, och regeln den drog med sig

Jag deferrade status med motiveringen "den ritas inte redan, alltså är det ett nytt märke".
Första ledet stämde, slutsatsen inte: att den *saknades* var skälet att den var viktigast av
dem. Mätt under `group=repo` med arkivet på — en `now`-rad och en `done`-rad identiska i
klass, opacity och text, med **131 av 175 pucker klara**. Väljaren skapade inte hålet, den
gjorde det läsbart. Och märket fanns redan: `.status-pill` satt i rälen, paletten och
blockerarlistan, den hade bara aldrig nått ett kort.

**Regeln den drog med sig:** det grupperingen redan säger säger raden inte igen
(`groupSays`) — samma regel som `autoDateField`, en egenskap bort, och en *default* som en
bock slår. Under `group=repo` går repo-cellen och statuschippet kommer; under
`group=status` tvärtom.

`parent` gjorde redan precis det här, fast som en **override** inuti sin egen vakt: bockad
eller ej försvann chippet under parent-gruppering. Det är felet filen namnger tre gånger.
Nu är den en default.

Och datumen ligger utanför regeln **strukturellt**, inte som ett omdöme: de går genom
`dateFields()`/`autoDateField()` och når aldrig `propOn`. Min första kontroll för det var
grön mot sitt eget sabotage, och skälet var värt mer än sabotaget — kvar står två
automatiker som säger emot varandra om `target`, och den äldre och smalare har rätt:
kolumnen hinkar per månad, raden säger "in 5 days". Kolumnen är grövre än raden.

## Och sorteringen på status

Samma form som egenskapen, en gång till: **mekanismen fanns redan en våning ned.**
`childItems()` har hela tiden sorterat en parents delar `status → manuell rank → titel`,
med kommentaren *"the order you'd work them"*. Den komparatorn hade bara aldrig nått
toppnivån. Det ger också sorteringen dess rätta namn — `sort=status` är **tavlans egen
läsordning, utplattad**: en lista grupperad på repo läser då varje repo precis som brädan
skulle läsa det vänster till höger. Manuell rank som andra nyckel, inte `updated`, för
`order` är puckens deklarerade plats *inom* sin kolumn, och det är vad brädan använder där.

Den är inert under statusgruppering, och erbjuds ändå — en menyrad som försvinner under
en teachar ingenting. Där råkar de två automatikerna vara överens: `groupSays` gömmer
statusegenskapen i exakt det fallet.

**En latent bugg på köpet.** `DATA.statuses.indexOf(status)` ger `-1` för en status
nyttolastens stege inte nämner, och `-1` sorterar **först** — före `now`. Inte
hypotetiskt: repots egen incheckade snapshot har fem statusar mot livetavlans sex, så en
avbruten puck hade lett listan. `statusRank()` är en skrivare nu, och `childItems` bar
samma flaw.

## Hover fastnar på en telefon

Rapporterat med en bild per kontroll: en mörk ruta runt precis det man nyss tryckte på.
På touch finns ingen pekare som *lämnar*, så `:hover` står kvar efter tappet. Konventionen
fanns redan i filen elva gånger — `@media (hover: hover)` — och listans fäll- och
arkivkontroller hade missat den. Mätt med `(hover: hover)` falskt och framtvingad `:hover`:
`.lh-toggle` och `.list-fold` målade `--panel-2`, medan `.list-row`, som hade guarden, inte
gjorde det.

Medvetet **inte** ett svep över alla 48 ovaktade hover-regler — de flesta sitter i ytor som
tappet stänger, eller flyttar bara en textfärg. Det som skiljer de fyra är att de målar en
bakgrund *och* står kvar under fingret.

Kontrollen är däremot ett svep över listans kontroller, inte fyra namngivna regler — en
uppräkning är precis det som missade en låda i rubrikfixen samma dag. Och den säger vad den
*såg*: första versionen bytte fixtur och tappade tyst `.list-fold` ur svepet, alltså kunde
den regelns sabotage inte längre fällas. Ett svep är bara så brett som det det fått svepa
över, och det måste kontrollen själv påstå.

## Kvar
- **Ordningen egenskaperna visas i** har redan en egen puck (`ordningen-egenskaperna-visas-i`).
  `PROPS` ordning är radens spårordning i dag; den pucken är där ett handval hör hemma.

## Tre fynd till från telefonen

Skärmdumpar under bygget, och alla tre var på riktigt:

- **Namnet gick in under arkivmärket.** "Bara namnet ger med sig" gjorde varje del av
  rubriken styv och fångade därmed lådorna som *håller* namnet — `.lh-stub` och
  `.lh-toggle` är barn till `h2`. Mätt på riktig data vid 390px: en stub 359px bred i ett
  246px `h2`, med namnet 89px in under märket. En låda får ge med sig bara om namnet är
  inuti den; första försöket missade den baksidan och la swatchen ovanpå titelns första
  bokstav.
- **Tavlan målade över foten.** `#board` är scrollcontainer i bägge axlarna och bidrar
  därför nästan ingenting till sin rads höjd. Med `auto`-rader tog rad ett bara
  överskottet (573px) medan brädan stod på 3019px, och skillnaden målades över foten.
  Bara nåbart sedan skalet fick en bestämd höjd — det enda den ändringen kostade.
- **Arkiverade parents stod kvar med arkivet av.** Och frågan som avgjorde det var
  Torbjörns: *vad skiljer arkiverad och Done?* Ingenting — `TERMINAL` är `done` eller
  `cancelled`, vilket växelns egen etikett säger. Fyra av sex rubriker var alltså
  arkiverade pucker på en tavla som gömmer arkiverade pucker, och ingen av dem räknad i
  vyns egna 32. En grupp lämnar med arkivet när den är arkiv *hela vägen upp*.

Två av kontrollerna för det här var gröna mot sitt eget sabotage när de skrevs, och två
till *hängde* i stället för att falla — en tom tavla är ett fel som ska säga en mening,
inte vänta ut trettio sekunder. Det är samma lärdom som filen redan bär på ett ställe:
kontrollen ska fällas, och den ska säga vad som saknades.
