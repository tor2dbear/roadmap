---
title: "Skapa en puck ur väljaren"
status: done
tags: [ui, dx]
updated: 2026-08-27
created: 2026-08-21
order: 15
depends: [ui-overlay-och-pickers]
parent: gui-hantverk
---

## Goal
Kunna skapa en puck direkt ur en referensväljare — "Ny etapp «Auth»" — utan att
först lämna det man höll på med.

## Research
Det starkaste mönstret i referensapparna (Notion/ClickUp) är **sök och skapa i samma
fält**: skriver du något som inte finns dyker "Ny «X» i *Resurser*" upp överst, och
måldatabasen är utskriven.

Det passar vår modell ovanligt bra, eftersom en etapp *är* en puck:
"skapa etapp" = "skapa puck + sätt `parent`". Idag är det två separata steg i olika
delar av GUI:t — ＋ Ny puck, sedan öppna den, sedan sätta Etapp.

`ui-overlay-och-pickers` byggde halva vägen: labels har redan "Create #ny-label",
och den öppna/slutna-regeln säger att pucks *får* skapas ur en väljare (till skillnad
från status och priority). Det som återstår är att skapandet inte är gratis här.

### Varför det inte bara är en rad till
En ny label är en sträng i frontmatter. En ny puck är:

1. **En fil i ett repo** — permanent. Repot är flödets enda irreversibla val, och
   `createPuck()` kräver det redan av just det skälet. Raden måste alltså namnge
   repot: *"Ny etapp «Auth» i **Etapp**"* — precis som referensappen skriver ut
   "i Resurser", fast hos oss av tyngre skäl.
2. **Ett commit.** Att skapa och sedan sätta `parent` är två skrivningar mot två
   filer; de kan halvfela. Antingen accepterar vi det (och rullar tillbaka den första
   om den andra misslyckas), eller så skapas pucken med `parent:` redan i mallen —
   vilket är en skrivning och därmed bättre.
3. **En titel, inte en slug.** Väljaren söker på titel; `slugify()` ger filnamnet.
   Det man skriver blir alltså titeln, och slugen visas som förhandsvisning
   (`np-preview` gör redan det i ＋ Ny puck).

### Snitt
- Raden syns bara när sökningen inte matchar något, och bara i väljare vars mängd är
  öppen (`Etapp`, `Blocked by`).
- Repo: puckens eget repo som förval, med möjlighet att välja annat. Cross-repo-fallet
  är ovanligt nog att inte behöva ligga i vägen.
- Skapandet går via `createPuck()` med `parent`/`depends` förskrivet i mallen, så det
  blir **ett** commit.
- Optimistisk render som allt annat: pucken finns på tavlan direkt, rullas tillbaka
  om commiten faller.

## Delivered
- **Raden finns i väljarprimitiven, inte i tre kopior.** `puckPicker` fick ett
  `create`-alternativ, så alla tre referensfälten ärver den. Den syns bara när
  sökningen är ifylld och ingen puck har **exakt** den titeln — en rad som skulle
  göra ett andra "Auth" bredvid det "Auth" som står ovanför den är en inbjudan till
  en dubblett, inte en genväg. En delträff hindrar den däremot inte.
- **Repot står i raden**, i samma slot som listan använder för att namnge ett
  främmande repo — den svarar på samma fråga: *var skulle det här hamna.*
- **Man står kvar.** Den öppna frågan är besvarad: att skapa ur en väljare är
  något man gör *mitt i* något annat, och att slänga sidan till den nya filen är
  precis avbrottet väljaren fanns till för att slippa. `createPuck` fick
  `open: false`.
  En fälla i just den ändringen: felvägen anropade `closeModal()` villkorslöst, så
  ett misslyckat commit hade stängt pucken man stod i. Den stänger bara den modal
  den själv öppnade nu.
- **`Blocked by` är med.** Den andra öppna frågan, och pucken svarade själv:
  blockeraren man saknar är oftare arbete ingen skrivit ned än en etapp är.
  Maskineriet är delat, så det kostade sex rader.

### En commit — eller två, och det beror på vilken ände man står i
Snittet ovan säger att `parent`/`depends` förskrivet i mallen gör det till **ett**
commit. Det stämmer bara när den nya pucken är **barnet**:

| Var man står | Den nya pucken är | Skrivningar |
|---|---|---|
| Etappens sida, `＋ Add puck` | barnet | **1** — `parent:` föds med filen |
| Puckens `Etapp`-fält | föräldern | 2 |
| Puckens `Blocked by` | blockeraren | 2 |

Relationen är authored på barnet, och i två av tre fall är barnet den puck man
redan står i — alltså en fil till som måste skrivas. Ordningen är
skapa-sedan-länka, och länken körs bara om skapandet gick igenom: annars hade en
puck pekat på en etapp som just rullats tillbaka. Faller länken i stället finns
etappen kvar och ligger på tavlan, vilket är en klickning från att lagas, och
`changeParent` säger det själv.

- **`later`, inte `inbox`.** Att lägga en puck i en etapp *är* att sortera den; en
  inbox-stubbe hade sorterats och sedan gömts av tavlan man sorterade den på.

## Verifiering
16 kontroller i `tests/create.test.mjs` — sviten första skrivvägstest, så fixturen
fick två saker: en token som sätts före laddning (varje redigerbar kontroll i skenan
är grindad på en) och en GitHub-stubbe som fångar varje `PUT` med sin sökväg och sin
avkodade fil. Påståendena ligger på vad som **commitas**, inte på vad tavlan råkar
rita efteråt: ett optimistiskt gränssnitt visar rätt sak ett ögonblick oavsett om
filen det skrev är vettig.

Fyra sabotage körda var för sig — mallen utan relationen, Contains via två
skrivningar, dubblettspärren borta, och den nya pucken öppnad ändå — fäller var sin
uppsättning.
