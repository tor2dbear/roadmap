---
title: "Filtermodell: chips, frågespråk, delbara vyer"
status: next
tags: [ui, ai]
updated: 2026-08-20
created: 2026-08-19
order: 10
---

## Goal
Bygga **en** filtermodell och ge den tre ansikten — chips, text och URL — så att
Linears filterpanel, ett agent-läsbart frågespråk och delbara/sparade vyer blir
samma bygge i stället för tre.

## Research

### Läget idag
- **Sök = substrängmatchning.** `matches()` slår ihop `title + body + tags +
  repoName` och gör `indexOf`. Inga fältfrågor, inga negationer.
- **Filterpanelen är fast, inte additiv.** Popovern har tre hårdkodade sektioner
  (Show done · Priority · labels). Varje nytt fält kräver en ny sektion — samma
  växbarhetsproblem som `gui-struktur-v2` löste för detaljvyn med properties-railen,
  men filterpanelen fick aldrig den behandlingen.
- **Vy-state ligger i localStorage, inte i URL:en.** Man kan länka till en enskild
  puck (hash) men inte till en **vy**.
- **Agenter utanför ett checkout** har bara en statisk JSON och `node -e`-recept i
  `AGENTS.md` — ingen frågeyta.

### Insikten (efter genomgång av Linears filterpanel)
En chip-rad som säger `Status: Now, Next` `Repo: PIA` `-Blocked` **är** strängen
`status:now,next repo:pia -is:blocked`. Två skepnader, en modell:

```js
// AND mellan fält, OR inom ett fält
[ { field: "status",  op: "in",  values: ["now", "next"] },
  { field: "repo",    op: "in",  values: ["tor2dbear/pia-terminal"] },
  { field: "blocked", op: "not", values: [true] } ]
```

| Ansikte | Vad | För vem |
|---|---|---|
| **Chips** | Linears panel — bygg genom att klicka | dig, särskilt på mobil |
| **Text** | `status:now repo:pia -is:blocked` | dig i ⌘K, och agenter |
| **URL** | `?q=…&group=target&layout=timeline` | delning + sparade vyer |

Linear har chips och en modell därunder men ingen textform — de behöver ingen,
deras användare sitter i appen. Vi behöver den, för nischen är att en agent ska
kunna svara med en **länk**. Samma bygge ger båda — men bara om modellen kommer
först och de tre ansiktena är renderare ovanpå den. Byggs panelen först och texten
sen har vi två system att hålla i synk.

### Fältlistan (Linears meny översatt till vår datamodell)
Status · Priority · Labels · Owner · Agent · Repo · Target/Updated/Created (med
`>`/`<`) · Etapp (`parent`, när fältet finns) · Blocked (`is:blocked`/`is:ready`,
härlett ur `blockedBy`) · Signals (`is:flagged`/`is:stale` — vår egen, ingen
Linear-motsvarighet) · fritext.

Medvetet **bortvalt**: Health/Members/Creator (kräver en andra sanning) och
**Advanced filter** (AND/OR-nästling) — textformen kan bära det den dagen behovet
finns, panelen behöver det inte.

### UI-detaljer värda att kopiera
- **Chips-rad under vy-headern** när filter är aktiva, med `✕` per chip + "Clear".
- **Räknare vid varje värde** ("4 pucks"), räknade med *övriga* filter applicerade.
- **Sökruta i undermenyn** när värdena är många — finns redan i label-sektionen
  (`fp-search`, `fp-n`/`tagCounts`, "Show all N labels"); generalisera den till en
  fält-agnostisk undermeny i stället för en hårdkodad sektion.
- **Chips för filter, blå prick för display.** Två signaler för två saker.
  `activeFilterCount()` räknar idag `showDone` som ett filter → Filter-knappen lyser
  "1" när du visat *mer*. Det försvinner när arkiv-toggeln flyttar till Display
  (se `display-meny-och-gruppering`) och chips ersätter räknaren.
- **Namnkollision att städa:** filterpanelen sätter rubriken `Disciplines` över
  **taggarna** (app.js:1876) medan samma sektions placeholder säger "Filter labels…"
  och knappen "Show all N labels" — och sidomenyns `Agents` är det som faktiskt bär
  discipliner (`agent:`). Döp filtersektionen till **Labels**, reservera "disciplin"
  för `agent:`.

### Sparade vyer
En vy är hela tupeln — **scope + filter + gruppering + sortering + layout** —
namngiven, i `board.config.json` (konfiguration, inte sanning):

```jsonc
{
  "views": [
    { "name": "Denna månad", "q": "target:<=2026-11-30 -status:done", "group": "target", "sort": "target" },
    { "name": "Redo för AI", "q": "is:ready agent:*", "group": "agent" },
    { "name": "Driftar",     "q": "is:flagged", "sort": "updated-asc" }
  ]
}
```

De dyker upp i sidomenyn bredvid Views (som i praktiken redan **är** fyra
hårdkodade sparade vyer). "Spara den här vyn" = ett commit via samma browser-write
som statusflippar — Linears "Set default for everyone" kräver en rollmodell, vi får
den ur git-behörighet + PR-review.

### AI-filter — vårt svar är bättre än en kopia
Linears "AI filter" översätter naturligt språk till ett filter och kräver en
backend. En statisk sida kan inte hosta det. Men: **dokumentera grammatiken i
`AGENTS.md` så skriver agenten du redan pratar med länken åt dig** — "vad väntar på
backend-agenten i PIA?" → `?q=agent:backend+repo:pia+is:ready`. Ingen runtime, ingen
NLU att underhålla, fungerar från vilket verktyg som helst. Linear måste bygga
AI-filtret för att deras data är inlåst; vi behöver bara publicera en grammatik.

### Byggordning
1. **Filtermodellen** — predikatlista + `matches()` som kör den.
2. **Text-parser + URL-serialisering** — billigast, gör vyer delbara.
3. **Chips-rad + "Add filter"-meny** — panelen, byggd på modellen.
4. **Sparade vyer** — en rad i Display-menyn som committar till `board.config.json`.

Steg 1–2 är förutsättning för 3 och 4. Andra ordningen bygger panelen två gånger.

## Beslut (tagna innan bygget)
- **Datumsyntax:** `updated:>=2026-08-01` — operatorn ligger *i värdet*, så varje
  term har samma form `fält:värde` och parsern delar på första kolon. Samma form som
  GitHub.
- **`is:`-familjen:** `ready` · `blocked` · `flagged` · `stale` · `adapted` · `done`
  (= done **eller** cancelled). `orphan` och `mine` väntar på `parent` respektive
  inloggning.
- **Scope = filter, olika yta.** En plats *är* ett filter som navigationen satt till
  exakt ett värde — `pickScope()` är "sätt predikatet till ett", ett filter är "sätt
  det till flera". Invarianten: **aldrig två källor till samma predikat** — sätts
  `repo:a,b` slocknar sidomenyns markering, i stället för att visa en plats som
  säger emot filtret.

## Levererat (steg 1–2)
Predikatmodellen och dess text- och URL-ansikte finns i `app.js`:

- **`FIELDS` + `IS_STATES`** — fältregistret (status, priority, agent, owner, tag,
  repo, issue, updated, created + alias) och de härledda tillstånden. Nytt fält =
  en rad, inte en ny gren i `matches()`.
- **`parseQuery` / `serializeTerms` / `runQuery`** — tokenizer som respekterar
  citattecken, negation med `-`, `,` = OR inom en term, AND mellan termer,
  datumjämförelser via strängordning på ISO. Okänt fält blir fritext i stället för
  att tyst försvinna.
- **`matches()` kör modellen.** Vyerna är strängar i `VIEWS` (`is:ready`,
  `is:flagged`, `status:inbox`, `-status:inbox`) i stället för if-grenar, och
  `viewCounts()` räknar med samma frågor — en radräknare kan inte längre driva ifrån
  vad raden visar.
- **Sökrutan förstår fält.** `status:now repo:pia -is:blocked` funkar där man redan
  skriver; fritext-delen är fortfarande det förslagen och quick-capture använder.
- **URL:en är tredje ansiktet.** `?q=` (filter, inkl. platser), `?view=` (namnger
  vyn), `?done=1` (arkivet — display, inte filter), `#repo/slug` (pucken) — och
  inläsningen delar ut termerna tillbaka till kontrollerna som äger dem, så en delad
  länk tänder rätt plats och rätt chips.
- **Grammatiken dokumenterad i `AGENTS.md`** — det är den som gör "AI-filter" onödigt:
  agenten svarar med en länk.

Verifierat i headless Chromium: 22 fall (vyer, `is:`-familjen, OR/negation/datum,
okänt fält, skrivning tillbaka till URL, platsmarkering, chip-spegling, djuplänk +
fråga samtidigt) — alla gröna, inga JS-fel.

## Kvar i den här pucken (steg 3–4)
- **Chips-rad + "Add filter"-meny** — panelen ovanpå modellen (fältlistan ovan).
- **Sparade vyer** i `board.config.json`, som en rad i Display-menyn.

## Open questions
- Räckvidd på räknarna i "Add filter"-menyn: räkna inom aktuellt scope eller globalt?
- Ska chips-raden visa *alla* termer, inklusive dem som kommer från vyn
  (`is:ready`), eller bara det man själv lagt på? (Förslag: bara egna — vyn har redan
  ett namn i headern.)
- `target:` läggs till i `FIELDS` när fältet finns (pass 3). Medvetet inte förskrivet
  nu: ett filter som tyst matchar noll är en fälla.
