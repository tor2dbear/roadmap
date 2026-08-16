---
title: Sluta committa genererad data + slå ihop skörd/deploy
status: later
tags: [ops, dx]
updated: 2026-08-16
order: 28
---

## Mål
Ta bort ett par lager komplexitet: idag committas `data/*` + `ROADMAP.md` tillbaka
till repot av synken, med idempotens-logik för att inte spamma historiken. Slås
skörd + deploy ihop till ett steg (`wrangler deploy` med färsk data byggd i CI)
försvinner flera saker på en gång — inga genererade filer i git, ingen idempotens,
ingen data-commit (och därmed inga `[skip ci]`-fällor).

## Skiss
- CI: skörda → `wrangler deploy` direkt (data byggs vid deploy, checkas aldrig in).
- Kräver `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` som GitHub-secrets, och
  att Workerns Git-build kopplas bort (annars dubbla deploys).

## Avvägning
`data/roadmap.json` i repot är bekvämt för människor/agenter att greppa. Om den
inte längre committas: agenter kan läsa den **deployade** `roadmap.json`-URL:en, och
den *primära* sanningen är ändå per-puck-markdown i källrepona (inte aggregatet).
Så förlusten är liten — men värd att vara medveten om (kopplar till agent-kontraktet).

## Beroende
Enablar GUI-skriv-vägen (tavlan blir en app med en `api/`-Worker). Kräver två
manuella steg av mig (secrets + koppla bort Git-build), därför `later` tills de görs.
