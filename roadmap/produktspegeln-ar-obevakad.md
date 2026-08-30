---
title: Produktspegeln är obevakad
status: later
tags: [ci, product]
updated: 2026-08-29
---

## Goal
Veta att `tor2dbear/etapp` — repot folk faktiskt forkar — går att köra, utan att
någon råkar titta.

## Research

`scripts/export-product.mjs` genererar produktrepot ur den här instansen, och
`sync-product.yml` kör den vid varje push till `main`. Jobbet rapporterar grönt när
*exporten* lyckades. Det säger ingenting om att resultatet fungerar.

Ingenting läser produktrepot efteråt:

| | bevakas | av vad |
|---|---|---|
| `tor2dbear/roadmap` | ja | 387 kontroller + `check-and-preview` på varje PR |
| `tor2dbear/etapp-site` | delvis | Cloudflares bygge (bygger, granskar inte) |
| **`tor2dbear/etapp`** | **nej** | — |

Så en export som skriver en trasig `sources.json`, tappar en fil ur `templates/`,
eller genererar en `package.json` vars `npm test` inte kan köras, skulle vara grön
här och trasig där. Den enda som märker det är den första främlingen som forkar —
vilket är exakt den person `validera-med-en-frammande-fork` handlar om att inte
bränna.

### Vad produkten faktiskt är, innan man planerar kontroller

`COPY` i `export-product.mjs` tar med harvestern, CLI:t, `lib/`, vakten, brädans tre
filer, typsnitten, konventionen och `templates/`. Den tar **inte** med `tests/`, och
den genererade `package.json` har varken ett `test`-skript, en lockfil eller
playwright — bara wrangler. Filens egen kommentar säger det rakt ut:

> the product ships no test runner and no browser.

Det är ett medvetet val, inte en lucka: en forkare ska kunna deploya utan att först
installera en testsele. Men det betyder att **kontrollerna inte kan bo i produkten**.
`npm ci` faller på avsaknaden av lockfil, och det finns ingen svit att köra där.

### Vad ett minsta nät skulle svara på, härifrån

Kör mot den genererade katalogen (`$RUNNER_TEMP/etapp-new`) med **det här repots**
sele, innan den pushas:

- **Går beroendena att lösa?** `npm install --dry-run` — inte `npm ci`, som kräver en
  lockfil produkten inte har.
- **Går skörden att köra?** `node scripts/harvest.mjs` mot den exporterade
  exempelkonfigen med `ROADMAP_LOCAL_ROOT` mot en attrapp — hela poängen är att den
  inte ska behöva nätet.
- **Går vakten att köra?** `node scripts/check-bundle.mjs` i trädet. Den är
  beroendefri av just det här skälet och är den enda kontroll som faktiskt *följer med*.
- **Renderar brädan?** Instansens boot-kontroll, pekad på den genererade `index.html`.
  Browsern finns här, inte där.

### Var det hör hemma

Ett extra steg i `sync-product.yml` här, före pushen — då blir en trasig export aldrig
publicerad, och produktrepot behöver ingen egen CI. Alternativet, en workflow i
produktrepot, kräver att produkten börjar skeppa en testsele, vilket är precis vad
exporten valt bort.

## Open questions
- Ska en misslyckad kontroll **stoppa** speglingen eller bara flagga? Att stoppa
  betyder att instansen och produkten kan glida isär tills någon lagar exporten.
- Hur mycket av instansens svit är meningsfull mot produkten? Flera kontroller
  ligger på den här brädans egen fixtur och data.
- Samma fråga gäller `etapp-site/demo/` — den speglas också och har heller ingen
  verifiering. Ett steg som täcker båda, eller två?
