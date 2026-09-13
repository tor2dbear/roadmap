---
title: Tomma egenskaper syns, och sätts där de syns
status: next
tags: [ui, product]
updated: 2026-09-12
created: 2026-09-12
priority: medium
owner: tor2dbear
---

## Goal

**En egenskap utan värde ska rita ett märke, inte ingenting — och märket ska gå att trycka
på.** Rapporterat från Linear med skärmdump: varje kolumn i projektlistan visar en dämpad
platshållare där värdet fattas (`---` för prioritet, en streckad person för lead, en
streckad kalender för måldatum), och ett tryck öppnar *Change priority…* direkt i raden.

Två saker, och de är olika. Den första är läsbarhet: en kolumn med hål i läses inte som en
kolumn. Den andra är skrivvägen: att sätta ett värde ska inte kräva att man öppnar pucken.

## Research

**Krokarna finns, och det är därför det här är litet.** `PROPS` driver raden, kortet och
grupprubriken ur en enda vandring, och varje post har redan ett `has(i)`-predikat som
avgör om cellen ritar något:

```js
{ key: "priority", label: "Priority", where: "cell", cls: "list-pri", track: "44px",
  has: function (i) { return !!i.priority; }, make: function (i) { return priorityBadge(i.priority); } },
```

Det är `has` som svarar *nej* i dag och lämnar cellen tom. En `empty`-medlem bredvid `make`
är hela ritningen: vad ritas när `has` är falskt.

**Spåret finns redan.** `CLAUDE.md` skriver ut varför: *"whether a cell exists is a question
about the view, never about the puck — emptiness is per-item, so skipping the date cell for a
puck with no target would shift every cell after it one track left."* Cellen är alltså
reserverad i listan; den är bara tom. Platshållaren kostar ingen layout.

**Och skrivaren finns.** Fyra funktioner går genom `commitFields()` — `changeStatus`,
`changePriority`, `changeAgent`, `changeTarget` — och de är redan det skenet pekar på från
puckssidans rail. `openSurface()` är den enda ytan, och den ger popover vid ≥640px och ark
under. En picker i en rad är alltså inget nytt maskineri: det är samma anrop från ett annat
ställe.

**Vad som faktiskt saknas:**

1. En `empty`-renderare per egenskap i `PROPS` — det dämpade märket.
2. En koppling från märket till rätt `change*`-funktion, via `openSurface()`.
3. En grind: `ghToken()` plus skrivrätt, samma som puckssidans kontroller.

**Regeln om stängda och öppna fält gäller oförändrat.** `status` och `priority` är stängda
gränssnittsfält — ett påhittat värde committar fint och släcks av `normalize*()` vid nästa
skörd, *"a write that looks like it worked and vanishes an hour later"*. Sök-och-skapa hör
alltså bara hemma där värdemängden är öppen. Det begränsar vad en radpicker får erbjuda,
inte om den får finnas.

**`null` är ett värde, inte ett hål**, och det är vad som gör platshållaren ärlig. `priority`
är `urgent`/`high`/`medium`/`low` **eller `null` = ingen**. Linear ritar `---` och erbjuder
*No priority* som ett val med bock i. Vi har samma modell och kan säga samma sak.

**`groupSays` behöver ingen ny gren.** Under `group=priority` upprepar raden inte prioritet —
kolumnen säger det redan — och då ska ingen platshållare ritas heller. Det följer av att
`groupSays` sitter före `has` i vandringen.

## Open questions

- **Kortet har inga spår, och det avgör halva pucken.** I listan är cellen reserverad och
  platshållaren gratis. Ett kort har ingen registerhållning alls, så där skulle varje
  otilldelad egenskap lägga till ett märke — mätt behov saknas, och kanban-kortet är redan
  det tätaste vi ritar. Rimligast är **bara raden först**, med kortet som egen fråga när
  raden stått ett tag. Men det gör listan och kortet olika på ett sätt `PROPS` hittills
  undvikit, och det är priset att väga.
- **Ska platshållaren ritas utan token?** Två grindar, inte en: *läsbarheten* (kolumnen har
  en form även för den som inte kan skriva) och *skrivvägen*. Ritas märket för alla men
  svarar bara för vissa bryter det regeln *"a control that only fails when you press it is
  not gated, it is decorated"*. Ritas det bara med token får en utloggad läsare en kolumn
  med hål i — precis det pucken ska laga. Kanske: märket alltid, som ren text; pekaren och
  pickern bara med skrivrätt.
- **Vilka egenskaper?** `status`, `priority`, `agent`, `target` har skrivare. `owner` är ett
  frontmatter-fält men har ingen `change*` ännu. `repo`, `updated`, `created`, `progress`,
  `rollup` och `count` är härledda och ska aldrig få en picker — en platshållare som inte
  går att fylla är en död ruta. Listan måste alltså vara explicit i `PROPS`, inte "allt som
  har `has`".
- **Omritningen.** En skrivning från raden ritar om brädan, och kolumnernas plats bärs numera
  över en omritning per nyckel (`colPlaces`). Raden man just skrev i ska stå kvar under
  fingret — det borde följa av det som redan finns, men det är värt att mäta och inte anta.
- **Hover är inget på en telefon.** Linear avslöjar affordansen vid hover. Brädan har regeln
  utskriven elva gånger: `:hover` är ett tillstånd man inte kan lämna på touch. Platshållaren
  måste alltså synas utan hover, och träffytan får inte hänga på den.
