---
title: "Beroenden: skrivväg + cross-repo"
status: done
tags: [core, dx, ai]
updated: 2026-08-20
created: 2026-08-19
order: 40
---

## Goal
Göra `depends` till en funktion man faktiskt kan använda: skrivbar från CLI och GUI,
giltig över repogränser, och synlig som en graf — eftersom `blockedBy[]` är det som
hela agent-erbjudandet vilar på.

## Research
`blockedBy[]` driver **Ready**-vyn och "vad kan jag ta nu?"-receptet i `AGENTS.md`.
Ändå är fältet halvbyggt:

- **Ingen skrivväg.** `scripts/roadmap.mjs` har inget `depends`-kommando (`new`,
  `start/next/later/done`, `tag`, `issue`, `owner`, `priority`, `agent`, `touch`,
  `list`, `install-hook` — inget mer). `app.js` har `commitStatus`, `commitPriority`,
  `commitAgent`, `commitIssue`, `commitTags`, `commitBody`, `commitDelete` — inget
  `commitDepends`. Enda vägen är handredigerad YAML, exakt det konventionen lovar
  att man ska slippa.
  Ett fält som bara går att handredigera blir i praktiken oanvänt — det är samma
  mönster som gjorde `order` osynligt (se `rank-skriv-order-fran-gui-t`).
- **Same-repo only.** Harvestern resolvar bara slugs inom samma källa
  (`puck-dependencies`: "cross-repo via fullt id senare"). På en *tvärrepo*-tavla är
  cross-repo-beroendet precis det man byggde tavlan för — `portability` i etapp beror
  i praktiken på konventionen i workshop, och det går inte att uttrycka.
- **Ingen graf, ingen cykelkoll, ingen kritisk väg.** Allt går att räkna ur datan
  som redan finns.

### Snitt
1. **`roadmap depends <slug> +<slug> -<slug>`** — samma form som `tag`, bumpar
   `updated`. Validera att målet finns; varna vid cykel.
2. **Rad i properties-railen** — `Blocked by` är redan en visad rad; gör den
   editerbar med samma browser-write som status (picker över pucker i samma repo,
   sedan över alla källor när cross-repo finns).
3. **Cross-repo via fullt id** — `depends: [tor2dbear/pia-terminal#vfs]`. Harvestern
   har alla källor i minnet vid resolve; `blockedBy[]` blir bara mindre naiv. Samma
   id-form som `parent` i `puck-hierarki-parent-rollup`.
4. **Cykeldetektering** vid harvest → en `signal` (`dependency-cycle`) i stället för
   ett tyst fel, plus `sources[].error` i PR-gaten om det är grovt.
5. **Graf/kritisk väg (kan vänta)** — "vad blockerar flest" är en sortering, inte en
   ny vy: räkna transitiva beroende-barn per puck.

## Levererat

**Skrivvägen finns nu i båda ändarna.** `roadmap depends <slug> +<ref> -<ref>`
(`--clear`) har samma `+/-`-form som `tag`, för det är samma sorts redigering — ett
listfält på en puck. På tavlan blev `Blocked by`-raden editerbar: ✕ per blockerare
och en `Add` som frågar efter en referens. Fältet är därmed inte längre något man
bara kan handredigera.

**Raden visar den *skrivna* listan, inte den filtrerade.** `blockedBy` döljer landade
blockerare — och en beroende man aldrig ser går inte att ta bort. Så railen listar
`depends` i sin helhet med de landade överstrukna, precis som `Pucks`-raden i
etappen.

**Cross-repo blev bara en referensform till.** `refKey()` från
`puck-hierarki-parent-rollup` gäller här också: bar slug = mitt repo,
`owner/repo#slug` = var som helst. `blockedBy` bär numera **id:n**, inte slugs, så en
blockerare i ett annat repo är en uppslagning och inte ett specialfall.

**Motsatta riktningen deriveras — som en exakt spegel.** `blocks[]` räknas vid skörd
ur samma kanter, med invarianten *x.blocks innehåller y precis när y.blockedBy
innehåller x*. Inget `blocks:`-fält att skriva, för två fält som kan säga emot varandra
är en andra sanning i miniatyr. Det ger `is:blocking` och en `Blocks`-rad utan ny
lagring — och `is:blocking` betyder därmed att något **ofärdigt** väntar, inte att
någon en gång skrev en rad.

**En okänd blockerare är inte en avklarad.** En referens som inte löser ut gav förut
inget alls — pucken såg *redo* ut fast dess författare trodde den var blockerad. Nu
står referensen kvar i `blockedBy` precis som den skrevs, plus flaggan
`depends-missing` (med referenserna i `missingDepends[]`). Det håller definitionen
enda: **tom `blockedBy` = redo**, för både tavlan och en agent som läser JSON:en. En
cykel ger `dependency-cycle` på **varje** puck i loopen, och en puck som beror på sig
själv är samma fel med en nod — den behålls och flaggas i stället för att tyst
kastas bort.

**Landat = `done` *eller* `cancelled`.** Förut släppte `blockedBy` bara `done`, så en
avbruten blockerare blockerade för alltid. En landad puck väntar dessutom inte på
något och håller inte upp något: dess kanter räknas i ingen riktning.

### Beslut som bygget tvingade fram
- **Cykel: vägra i CLI och GUI, flagga vid skörd.** Lokalt vet vi tillräckligt för att
  neka; över repogränser vet bara skörden, och där står kanterna kvar — till skillnad
  från en etapp-förälder finns ingen länk som är *den* felaktiga att klippa.
- **En cross-repo-blockare blockerar även när källrepot är bortfiltrerat.** Scope är
  en vy, inte en sanning; annars skulle Ready-vyn ljuga.
- **Hela listan skrivs i ett commit.** Samma regel som `order`+`status` vid ett drag:
  en handling, en commit.

Verifierat: 21 fall i headless Chromium (frågespråk åt båda håll, detaljvyns två rader,
✕/Add/cross-repo-form/loopvägran/självberoende/sista-blockeraren) plus de sju tidigare
sviterna som regression — och, nytt för det här passet, en **end-to-end-svit över den
riktiga harvestern**: den bygger ett fixtur-checkout, kör `harvest.mjs` och läser
payloaden. Webbsviterna matar in handskrivna payloads och kan därför bara fånga fel i
tavlan; deriveringen behövde sitt eget nät. Det var också det som lät mig verifiera
spegel-invarianten över hela datan i stället för på ett exempel.

## Medvetet inte byggt
- **Graf och kritisk väg.** "Vad blockerar flest" är nu en sortering bort — `blocks[]`
  finns i datan — men vyn väntar tills någon faktiskt vill ha den.
- **Transitiv `blockedBy`.** Ett steg räcker för "vad kan jag ta nu?"; djupet skulle
  bara göra ⛔-tooltippen obegriplig.
