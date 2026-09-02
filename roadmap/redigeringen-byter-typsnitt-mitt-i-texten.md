---
title: Redigeringen byter typsnitt mitt i texten
status: done
tags: [ui, editing]
updated: 2026-09-02
created: 2026-09-01
---

## Goal

*Edit body* byter ut den renderade puck-texten mot ett fält på samma plats — och
texten växer och byter typsnitt i samma rörelse. Det läser som att man har zoomat,
inte som att man har börjat redigera.

## Research

Mätt i webbläsaren, inte tyckt (listor, inte tabell — tavlan renderade inte
tabeller när det här skrevs, se `markdown-rendering-genomgang-av-formateringen`):

- **Renderad text** (`.modal-body`): 14px Geist, `line-height` 22.4px.
- **Redigering** (`.body-editor`): 16px Geist Mono, `line-height` 25.6px.

Två steg upp i skalan (`--fs-lg` → `--fs-2xl`) *och* proportionell → mono i ett
enda byte, i en låda vars innehåll dessutom är samma text.

**16px är inte godtyckligt, och det är halva problemet.** `--fs-2xl` är uttryckligen
golvet iOS kräver för att inte zooma in ett fokuserat fält. Men det golvet gäller
**formulärkontroller** — `input`, `textarea`, `select` — inte text i allmänhet. Och
regeln för vad man gör åt det stod redan skriven i kommentaren ovanför själva golvet
i `styles.css`:

> Where the floor is genuinely unwanted, the answer is to not have a native field.

Den meningen skrevs när de två `<select>`:arna blev `openSurface()`-väljare. Den var
aldrig avgränsad till `select` — den var bara inte tillämpad på det sista fältet den
gäller.

## Delivered

Editorn är en `contenteditable="plaintext-only"` i stället för en `<textarea>`, och
möter därför den renderade texten på 14px. Golvet står kvar exakt där en riktig
formulärkontroll står kvar: `@media (max-width: 640px) { textarea.body-editor }` —
klassen behövs för att slå den nakna `textarea`-regeln på specificitet, och raden
säger samtidigt högt att golvet handlar om *elementet*, inte om den här editorn.

**`plaintext-only` och inte `true`.** En vanlig contenteditable stoppar in `<div>`,
`<br>` och `<span style>` vid radbrytning och inklistring. En markdown-källa som tyst
får med sig markup in i .md-filen vore en värre bugg än ett stort typsnitt. Där
`plaintext-only` saknas (Firefox före 136) kommer `<textarea>` tillbaka, golv och
allt — detekterat, inte sniffat: IDL-settern tar bara emot värden motorn stöder.

**Auto-grow försvann.** En låda webbläsaren låter växa av sig själv behöver ingen
`scrollHeight`-mätning. Det är den enda maskindelen ändringen tar bort i stället för
att lägga till.

**Två CSS-rader skrevs och togs bort efter mätning.** `white-space: pre-wrap` och
`overflow-wrap: anywhere` såg nödvändiga ut och kunde inte avgöra någonting: en motor
som erbjuder `plaintext-only` pinnar lådan till `pre-wrap` själv och låter inte en
egen `white-space: normal` vinna, och sidbredden en lång URL hotar kommer redan från
`min-width: 0` på `.detail-pane` — 390px med `anywhere` och 390px utan. Precis det
`doda-css-regler-som-forlorar-pa-ordning` handlar om, fångat innan det landade.

**Två rader försäkring står kvar, och de går inte att fälla härifrån.** `read()`
använder `innerText` och tvättar hårda mellanslag. Mätt i Chromium gör ingendera
någon skillnad: lådan innehåller bara textnoder med riktiga radbrytningar, och två
anslag mellanslag ger två mellanslag. De står kvar för att webbläsaren ändringen
*finns för* är den som inte går att mäta härifrån, och båda felen de skyddar mot är
tysta och hamnar i git.

**Verifiering.** Sex kontroller i `tests/create.test.mjs`, mätta genom commiten och
inte genom lådan: elementet är ingen `textarea`, redigering och läsning har samma
storlek, och en kropp som skrivs med tangentbordet — nästlad lista med två inledande
blanksteg och en tomrad — kommer ut ur GitHub-stubben tecken för tecken. Sabotage som
fäller dem: tillbaka till `textarea` (tre kontroller), tillbaka till 16px (en).

## Open questions

- **Kvarstår att verifiera på enhet:** att iOS faktiskt låter bli att zooma en
  `contenteditable` under 16px. Mekanismen säger det, och Chromium kan inte svara på
  det — samma klass av fråga som `headern-malas-inte-vid-omladdning`. PR-previewen är
  där den avgörs.
- Mono behölls: markdown-källa *är* kod-nära, och indrag och kodstaket radar upp sig.
  Om det ska ändras är det x-höjden som ska matcha, inte punktstorleken.
- Samma golv gäller fortfarande de enradiga fälten (sök, titel, token) och `New
  puck`-formulärets kontextruta. De är inte klumpiga på samma sätt — ett sökfält vill
  vara stort — men kontextrutan är också flerradig och kan gå samma väg om den skaver.
