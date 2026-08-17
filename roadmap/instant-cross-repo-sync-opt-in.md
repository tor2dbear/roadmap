---
title: Instant cross-repo sync (opt-in)
status: later
tags: [product]
updated: 2026-08-17
created: 2026-08-16
order: 32
depends: [deploy-simplification]
---

## Mål
Låt puckar i **källrepon** (cadence, pia, portfolio …) nå tavlan på sekunder
istället för att vänta på timkörningen — **utan** att göra kärnprodukten svårare
för andra. Instant sync ska vara ett **tillval**, inte ett krav.

## Princip (håll USP:en intakt)
En trigger är **inte** ett lager. Endpointen lagrar ingen roadmap-state — den
säger bara "skörda nu". Sanningen bor kvar i puckarna. Alltså tummar detta inte
på "aldrig en andra sanningskälla" — det är tillåtet **som opt-in**. Kärnan
(schemalagd, zero-backend, en deploy) skeppas oförändrad; instant blir en
dokumenterad modul power users kan koppla på.

## Skiss (den lätta varianten)
- **Install-once:** en GitHub App på kontot med "alla repon" → täcker befintliga
  **och framtida** repon automatiskt (nya ärver behörigheten, noll per-repo-jobb).
- **Trigger-relä:** en liten `fetch`-handler **på board-Workern vi ändå deployar**
  (ingen ny alltid-igång-tjänst). Webhook in → Workern `workflow_dispatch`:ar
  sync-workflowen via GitHub-API. Workern skördar inte själv — den knuffar igång
  Actionen som gör det.
- Avgränsa till puck-ändringar (t.ex. paths `roadmap/**`) så vi inte deployar på
  varje commit.

## Varför inte `repository_dispatch` per repo
Den varianten kräver en workflow + token-secret i **varje** källrepo, om och om
igen för varje framtida repo. Det per-repo-tramplan är precis friktionen som gör
verktyget mindre smidigt — undvik den.

## Paketering (etapp)
- **Kärnan:** rör inte. Zero-backend, en deploy. Ev. tätare schema som gratis
  default för de som vill ha "färskt inom en kvart" utan något tillval.
- **Instant cross-repo:** skeppas som opt-in-modul + "advanced"-doc i etapp. Min
  instans kan köra den utan att produktens default blir svårare för forkare —
  instansens komplexitet läcker inte till dem.

## Öppna frågor
- App-webhook direkt mot Workern, eller via ett tunt mellanled? (Signatur-
  verifiering av webhooken behövs oavsett.)
- Var bor App-registreringen/dokgränsen mellan "min instans" och "produkten"?
- Räcker tätare schema (var 10–15 min) egentligen, så instant aldrig behövs?
