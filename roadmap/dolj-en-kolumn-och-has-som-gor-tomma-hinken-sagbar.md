---
title: "Dölj en kolumn — och has: som gör tomma-hinken sägbar"
status: now
tags: [ui, product]
updated: 2026-08-26
created: 2026-08-26
order: 5
---

## Goal
Ge kolumnhuvudet Linears `⋯` med *Hide column* — utan att införa ett andra ställe där
vy-tillstånd bor.

## Research
Frågan som startade det här var om `Show done & cancelled` och `Show empty columns`
skulle **bytas ut** mot per-kolumn-döljning. Svaret är nej, och koden är tydlig med
varför:

- **`Show done & cancelled` är ett objektfilter, inte en kolumnkontroll.** `viewTerms()`
  skjuter in `NOT_DONE` i frågan, så done-puckar försvinner i *alla sex* grupperingarna.
  En DONE-kolumn finns bara när man grupperar på status. Att byta reglaget mot "dölj
  DONE-kolumnen" hade lämnat kvar done-puckar i fem grupperingar av sex.
- **`Show empty columns` är en regel, inte ett urval.** Den utvärderas vid varje render
  och följer med när antalen ändras. En manuell dölj-lista blir fel i samma sekund som
  en dold kolumn får ett kort.

De är alltså inte samma sak som *Hide column*, och de tre kan samexistera.

**Det fanns redan ett ställe för tillståndet.** Filtret är en *frågesträng med negation*
(`-status:inbox`), inte en inklusionslista, och `toggleFilterValue(field, value, neg)`
fanns redan. En kolumn *är* ett värde av grupperingens fält — så att dölja en är en
negerad term i frågan vi redan har. Det ger serialisering till `?q=`, sparande i vyer,
och en väg tillbaka gratis: `chipsData()` renderar redan negerade termer som ett
borttagbart `Not Status: Later ×`. Det är bättre än Linears "2 projects hidden by
display options", för det *namnger* vad som är dolt.

**Ett hål i grammatiken.** Fyra kolumner har frånvaron av ett värde som nyckel —
`No priority`, `Unrouted`, `No etapp`, `No target`. Det finns ingen `-priority:x` som
namnger dem. Att räkna upp alla riktiga värden i stället (`priority:urgent,high,…`)
fungerar bara för en *sluten* mängd och går tyst fel för agenter och etapper, där ett
nytt värde skulle dyka upp redan dolt.

**Och en kolumn som inte går att namnge.** `target` grupperar på *månadshinkar* över ett
datum. Att namnge en hink kräver ett intervall — två termer — och att negera en
konjunktion är inget den här grammatiken kan säga.

## Delivered
- **`has:<fält>`** — frågar om pucken bär fältet alls. Symmetrisk med `is:`, negerbar,
  en rad i parsern och en gren i matchern. Det är så "dölj No priority-kolumnen" stavas,
  och det gör grammatiken mer komplett för agenter på köpet.
- **`⋯` på kolumnhuvudet** med *Show only this* och *Hide column*, i samma form som
  puckens `⋯`. Den visas bara där kolumnen faktiskt går att namna med en term — en
  target-månad får ingen, för en död menypost är sämre än ingen.
- **En regel i stället för fyra.** Första försöket jagade det per kolumn: "finns en
  negation som namnger mig, eller en positiv term som utelämnar mig, eller ett `has:`
  på mitt fält". Det var fyra regler som ändå missade korsparet — `-has:priority` tömmer
  varje *riktig* prioritetskolumn, och ingen regel om `priority:`-termer kan se det.
  Regeln som håller: **en tom kolumn är ett droppmål värt att behålla tills filtret
  uttalar sig om just det fält kolumnerna är gjorda av.** Då är den ett hål där en
  kolumn stod. `tag:ui` behåller alltså alla kolumner som mål; vilken term som helst på
  grupperingens eget fält tar bort de tömda. Uttalad i `groupsOf()`, som tavlan och
  listan delar, så den sägs en gång.
- **`eye` / `eye-off` (Feather)**, skalade till setets 15-rutnät.
- **Ett fack för de dolda kolumnerna**, sist på tavlan, efter en skärmdump av hur
  Linear gör det. Deras lösning är bättre än vårt chip, och skälet är konkret: den
  visar **antalet**. `Backlog 4` säger vad man missar utan att man behöver ta tillbaka
  kolumnen; `Not Status: Later ×` säger bara att något är borta. Facket behåller också
  kolumnens identitet — prickens färg och namnet — i tavlans eget rum i stället för
  att blanda sig med tagg- och textfilter i chipsraden. Båda finns kvar: chipsraden är
  den allmänna vägen ut ur ett filter, facket är den rumsliga vägen tillbaka till en
  kolumn. Tavlan bara: facket är en *plats* ("de skulle ha legat här borta"), och en
  platt lista har inga kolumner att ligga sist bland — där räcker chipsen.

### Vilka kolumner som räknas som dolda
Termer skalas bort ur `state.query` — aldrig ur vyns egna eller ur en plats. `-status:inbox`
är vad "All pucks" *betyder*, inte något man dolt, och ett repo-ställe är dit man
navigerat; att ta bort dem också hade listat Inbox som dold på varje tavla. Antalet per
rad räknas mot frågan *utan* det som döljer just den kolumnen — alltså exakt vad man får
tillbaka om man trycker på ögat.

### Platsen är en dörr, inte en lapp
`Show only this` på en repo- eller agent-kolumn är **navigation**, inte ett filter.
De två är sidomenyns *platser* (`controlTerms()`), och `readUrl` gör redan om en
positiv `repo:`/`agent:`-term till en plats vid inläsning — med vakten `!t.neg`, för
det finns ingen plats som heter "inte PIA". Att skriva den som en frågeterm gjorde
därför att **samma URL ritade två olika chrome**:

| `?q=repo:roadmap` | sidorad | chipsrad | rubrik |
|---|---|---|---|
| direkt efter klicket | släckt | visar termen | `All pucks` |
| efter en omladdning | tänd `Etapp` | tom | `Etapp` |

Ingenting rördes däremellan. Ett tillstånd, två bilder, och en länk som såg annorlunda
ut för den som öppnade den färsk. Nu går den positiva halvan via `goToPlace()`, och
`pickScope()` ger "tillbaka till allt" på andra klicket gratis. Negationen förblir en
term — alltid.

### Etikettmaskinen kunde inte skriva "repo"
Chipsraden gav `repo:roadmap` i stället för `Repo: Etapp`, och för en dold kolumn
`Not -repo:roadmap` — två minustecken för en negation. `fieldByKey("repo")` hittar
ingenting, för `FILTER_FIELDS` utelämnar repo och agent *med flit* (de är platser, inte
paneldimensioner), så `chipsData()` föll igenom till sista grenen och skrev av termen
rått — inklusive dess minustecken — varpå `"Not "` lades framför.

Buggen låg latent: den gick bara att väcka genom att skriva frågan för hand. Kolumnmenyn
i det här passet gjorde den till ett klick, alltså är den det här passets att laga.
`PLACE_FIELDS` namnger de två utan att lägga dem i panelen, så beslutet står kvar. Sista
grenen strippar nu tecknet, så nästa okända fält saknar bara ett namn — inte ett andra
minus.

## Verification
Körd i Chromium mot alla sex grupperingarna: dölj → kolumnen försvinner *med sitt
huvud*, `?q=` får termen, chipset dyker upp, och `×` på chipset tar tillbaka den.
`has:priority` för tomma-hinken, `-repo:roadmap` för repo, och target-månaden saknar
`⋯` medan `No target` har den. Listvyn följer med. Noll konsolfel, och
kontrastgranskningen är ren på tavlan, i menyn och på puckssidan i båda temana.

Platsen: `Show only this` på en repo-kolumn ger nu tänd sidorad, tom chipsrad och
rubriken `Etapp` — **identiskt före och efter en omladdning av samma URL**. `Hide column`
på samma kolumn ger `Not Repo: Etapp`, också stabilt över omladdning. Status-vägen är
oförändrad (`Not Status: Now`, kolumnen borta, facket visar `Now 3`).

Facket: dolt via negation ger `Later 15` och ögat rensar termen; dolt via *Show only
this* ger `Now 3` och `Later 15`, och ögat lägger tillbaka rätt värde i den positiva
termen (`status:next` → `status:next,now`) — motsatt polaritet mot det första fallet, och
den skillnaden var värd att provköra. Ett orelaterat filter (`tag:ui`) ger inget fack
alls.

En bugg som riggen fångade och jag annars hade missat: *Show only this* lämnade först
kvar Now och Later som **tomma** kolumner, eftersom status bygger sina kolumner ur en
fast lista. Det var det som tvingade fram regeln ovan.

### Granskningsfynd
Codex läste passet och lämnade åtta, alla riktiga. Tre var buggar i det jag byggt, ett
var större än rapporten sa:

- **`Show only this` var en växel, inte ett påstående.** Med `status:now,next` satt tog
  den *bort* `now` och lämnade den motsatta kolumnen; på ett singleton nollställde den
  filtret helt. Samma fel i platsvägen — `pickScope` läste andra klicket som "tillbaka
  till allt". Kommandot skriver nu exakt en sak, och är idempotent i båda vägarna.
- **Ögat lade till sitt eget predikat i stället för att laga det som uteslöt.** Med
  `priority:high` gav facket `-has:priority`, och eftersom termer ANDas matchade
  `priority:high -has:priority` ingenting — kolumnen stannade dold och **tavlan blev
  tom**. Nu lagas den term som faktiskt uteslöt: en negation tappar namnet, en positiv
  får det, och absens-paret tas bort. Två dolda och en återställd låter den andra vara.
- **Repo-kolumnen skickade kortnamnet.** `FIELDS.repo` matchar kortnamnet för *varje*
  ägare, så på en tavla med två `roadmap` under olika ägare hade `Hide column` dolt
  båda. Kolumnen bär redan hela `owner/name`, och grammatiken tar det.
- **`No etapp` frågade fel fråga.** Kolumnen hinkar på `parentRef`, men `has:parent`
  svarar ja på en `parent:` som inte resolvar. En sådan puck hade överlevt att man dolde
  hinken. `is:member` är samma fråga som kolumnen ställer.
- **`has:` var odokumenterat** i `AGENTS.md`, trots att det nu är enda sättet att namnge
  en frånvaro. Tillagt, med negationssemantiken.

**Och ett fynd som var större än rapporten.** Codex flaggade att mörka `--ink-3`,
`--done` och `--cancelled` blivit sämre som *bakgrund* under vit text. Sant — men
mätningen visade att vit text på **varje** sådan token fallerade i mörkt läge, och
gjorde det före det här passet: `--later` på 2.37:1, `--next` på 2.78, `--inbox` på 2.99.
Regeln jag skrev ("varje färg som bär ord klarar 4.5:1") tänkte bara på tokenen som
förgrund. Speglingen saknades.

Svaret blev inte nio bakgrundstvillingar utan en token: `--on-solid` — vit i ljust,
`var(--bg)` i mörkt, där sidans egen grund läser 5.35–7.49 på samtliga. `--danger-solid`
är undantaget och behåller vitt, för den är mörk i båda temana, vilket är hela skälet
till att den finns. `.demo-ribbon` hade redan hittat problemet och hårdkodat ett mörkt
bläck åt sig själv; det här är den fixen generaliserad — och den täcker `auto`-temat,
som den handgjorda missade. Mätt: 22 inversa kontroller, alla över AA i båda temana.

## Medvetet inte byggt
- **Ingen agent-dimension i filterpanelen.** Jag tänkte lägga till en, tills panelen
  visade sig säga rakt ut att *"Repo and agent are deliberately absent — they are the
  sidebar's places"*. Kolumnmenyn skriver `-agent:x` direkt till frågan, vilket är en
  annan dörr, inte samma. Panelens beslut står.
- **Reglagen står kvar.** Se Research.

## Open questions
Inga kvar. Platsfrågan blev besvarad av en mätning i stället för av en åsikt — se
*Platsen är en dörr, inte en lapp*.
