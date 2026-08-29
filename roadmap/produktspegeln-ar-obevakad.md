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

### Vad ett minsta nät skulle svara på

- **Går den att installera?** `npm ci` i en ren klon av produktrepot.
- **Går skörden att köra?** `node scripts/harvest.mjs` mot exempelkonfigen, med
  `ROADMAP_LOCAL_ROOT` mot en attrapp — hela poängen är att den inte ska behöva
  nätet.
- **Är sviten med, och grön?** Exporten tar med `tests/` i dag; kör den där.
- **Renderar brädan?** Samma boot-kontroll som instansen har.

### Var det hör hemma

Antingen som ett extra steg i `sync-product.yml` här (kör mot `$RUNNER_TEMP/etapp-new`
*innan* den pushas — då blir en trasig export aldrig publicerad), eller som en egen
workflow i produktrepot. Det första är strikt bättre: en export som inte går att köra
ska inte nå `main` alls, och då behöver produktrepot ingen egen CI.

## Open questions
- Ska en misslyckad kontroll **stoppa** speglingen eller bara flagga? Att stoppa
  betyder att instansen och produkten kan glida isär tills någon lagar exporten.
- Hur mycket av instansens svit är meningsfull mot produkten? Flera kontroller
  ligger på den här brädans egen fixtur och data.
- Samma fråga gäller `etapp-site/demo/` — den speglas också och har heller ingen
  verifiering. Ett steg som täcker båda, eller två?
