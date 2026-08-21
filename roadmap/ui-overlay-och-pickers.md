---
title: "UI-ramar: overlay-primitiv och pickers"
status: now
tags: [ui, product]
updated: 2026-08-21
created: 2026-08-21
order: 5
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

**Sheeten går att dra.** Ner förbi ~96 px stänger, upp snäpper till full höjd
(94dvh), allt däremellan fjädrar tillbaka. Handtaget är greppet, men hela chromet
lyssnar; från listan tar dragningen bara över när listan redan ligger i topp och
fingret går nedåt — annars är gesten en scroll och att stjäla den vore fel.

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

Verifierat: 40 fall i `surface.mjs` över **båda** viewporterna (390×844 och
1280×900), plus åtta tidigare sviter som regression.

## Open questions
- **"Hela månaden" i datepickern?** `target` lagras exakt men *visas* grovt, och
  `roadmap target <slug> 2026-11` betyder "i slutet av november". En kalender som bara
  erbjuder dagar puttar mot en precision vi valt bort. Förslag: en "Hela månaden"-knapp
  i månadshuvudet som sätter sista dagen — ett lagrat format, grov avsikt med ett tryck.
- **Ska "Ny etapp «X»" skapa pucken direkt?** Det är den starkaste idén från
  referenserna, men skapandet är inte gratis hos oss: en fil, ett repo-val, en commit.
  Antingen bygger vi det med repot utskrivet i raden, eller så låter vi väljaren bara
  välja bland det som finns.
