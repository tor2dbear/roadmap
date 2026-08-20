---
title: "Display-meny + gruppering som variabel"
status: next
tags: [ui, product]
updated: 2026-08-20
created: 2026-08-19
order: 20
---

## Goal
Samla layout, gruppering och sortering i **en** Display-meny — och göra grupperingen
till en *variabel* i stället för hårdkodad status, vilket ger tidslinje, etapp-vy och
PO-köer ur samma bygge.

## Research

### Grupperingen är hårdkodad — och det är den dyra begränsningen
`renderBoard()` hämtar kolumnerna ur `columnsForFocus()` och skickar dem till
`renderColumns`/`renderList`. Kolumnerna är **alltid statusar**. Görs grupperingen
till ett fält faller flera "nya vyer" ut som samma kod:

| Gruppera på | Vad du får |
|---|---|
| `status` | dagens kanban (oförändrat) |
| `parent` (etapp) | initiativ-tavla med rollup |
| `target` | **tidslinjen** — roadmapen som en roadmap |
| `agent` | PO-konsolens disciplin-köer |
| `repo` | flottvyn |
| `priority` | triagevy |

Renderingskoden tar redan emot en grupplista. Det som behövs är en `groupBy`-funktion
(puck → gruppnyckel), regler för hur grupperna sorteras, och en "utan värde"-hink
sist. **Timeline-layouten är då inte ett tredje bygge** — den är gruppering på
`target` med en annan kolumnrendering.

### En vy = fem axlar
```
scope       repos + discipliner      (sidomenyn — navigation)
filter      frågan                   (chips/text — se filtermodell-pucken)
gruppering  vilket fält som blir kolumner
sortering   ordningen inom en grupp
layout      lista · bräde · tidslinje
```
Allt annat — URL, sparade vyer, frågespråk — är sätt att skriva ner den tupeln.

### Menyn (efter Linears "Display", anpassad)
```
[ ☰ List ]  [ ▦ Board ]  [ ⊟ Timeline ]

Grouping   Status ▾      Ordering   Manual ▾
──────────────────────────────
Show done & cancelled   ◯     Show empty groups   ◯
──────────────────────────────
Reset                            Save as view
```

- **Namnet: `Display`.** Inte "View" — sidomenyn äger redan *Views* som
  navigation/scope (`gui-struktur-v3`), och två saker med samma namn i samma skärm
  är värre än ett lånat ord. Inte "Layout" — det är en av tre rader.
- **Topbaren blir tre knappar:** Filter · Display · Sidebar. `Sort`-selecten och
  `☰`-toggeln försvinner in i Display. Det är v2/v3-riktningen: nästan tom topbar.
- **Blå prick på Display** när något avviker från default (Linears signal). Filter
  visar chips i stället för räknare — se `fragesprak-delbara-vyer`.
- **Sub-grouping: vänta.** Linear behöver det för team × project × cycle. Det blir
  meningsfullt först när `parent` finns (gruppera på Etapp, subgruppera på Status).
- **"Show empty groups"** är en följd av grupperings-variabeln, inte en egen idé —
  med gruppering på status finns knappt tomma grupper, med etapp/target gör det det.
- **"Save as view"** hör hemma längst ned här (Linears "Set default for everyone",
  fast git-nativt: ett commit till `board.config.json`).

### "Show done & cancelled" flyttar hit från Filter
Strikt ändrar togglen *vilka* pucker som visas, alltså ett filter. Tre skäl väger över:
1. **`activeFilterCount()` räknar den som ett filter** → Filter-knappen lyser "1" när
   du visat *mer*. Semantiken går inte ihop; motsägelsen försvinner vid flytten.
2. Den är ingen urvalsaxel som repo/label/priority — den är **arkivsynlighet**, ett
   läge man ställer in en gång.
3. Linear gör likadant ("Show closed projects" i Display, i egen sektion).

Följd: den ska då **persistas i localStorage** som `sort`/`view` gör. Idag persistas
den inte alls och nollställs vid varje omladdning.

### Kortets fält ska följa vyn
`card()` gör alltid `if (item.updated) dateEl(item.updated)`. Sorterar man på "Newest
created" ordnas kolumnen efter ett datum som inte syns någonstans — och med `target`
blir det värre. **Visa det datumfält man sorterar eller grupperar på**, annars
`updated` som idag. (Linears "Display properties"-chips är den generella lösningen;
det smarta defaultet räcker långt och kostar nästan inget.)

### Kopplingar
- `tidsaxel-target-horisont` — Timeline-layouten kräver `target`-fältet. Menyn och
  grupperings-variabeln kan skeppa före; bara tidslinje-läget väntar. (Ett fall där
  `depends` är för grovt: beroendet gäller en del av pucken, inte hela.)
- `puck-hierarki-parent-rollup` — samma sak för etapp-gruppering.
- `rank-skriv-order-fran-gui-t` — äger Ordering-radens innehåll och skrivvägen.
- `fragesprak-delbara-vyer` — äger Filter-knappen; "Save as view" behöver dess modell.

## Open questions
- Hur sorteras grupperna själva per fält? (status = konventionens ordning, target =
  kronologiskt, etapp = förälderns `order`, repo = `sources.json`-ordningen, agent =
  alfabetiskt?)
- Var hamnar puckar utan värde — hink först eller sist, och heter den "Ingen etapp"
  eller "—"?
- Ska gruppering + layout ligga i URL:en från dag ett (`&group=target&layout=timeline`)
  eller bara i localStorage tills sparade vyer finns? (Förslag: URL direkt — annars
  är vyn inte delbar, vilket var halva poängen.)
- Timeline-layout: kolumner per månad/kvartal, eller ett riktigt gantt-liknande band?
  (Förslag: kolumner — samma kod som brädet, noll ny rendering.)
