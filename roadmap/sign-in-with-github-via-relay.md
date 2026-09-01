---
title: Sign in with GitHub via relay
status: later
tags: [product, auth]
updated: 2026-09-01
created: 2026-08-17
order: 33
depends: [gui-editing]
---

## Mål
En **"Sign in with GitHub"** i GUI:t som valfri uppgradering ovanpå `gui-editing`s
paste-token-default.

## Varför — inte "för att slippa klistra in"
Den som forkar det här kan klistra in en token: hen har repon med roadmaps, redigerar
`sources.json` och deployar själv. Bekvämlighet är alltså ett svagt skäl, och det var
det skäl den här pucken stod på tidigare. De två som håller:

- **Förtroende vid första kontakten.** En främling ombeds mynta en credential med
  `Contents: write` på sina repon och klistra in den i en sida hen känt i nittio
  sekunder. Det är ingen färdighetsfråga. OAuth tar inte bort frågan — reläet ser
  token:en också — men samtyckesskärm plus återkallningssida är en *bekant* ritual.
  Ett textfält är det inte.
- **Scope-hygien.** En handmyntad PAT blir för bred, för att det är lättare att kryssa
  i `repo` än att välja tre fine-grained behörigheter. OAuth begär exakt de scopes
  appen deklarerar. Det är en säkerhetsförbättring för användaren, inte bara UX.

## Varför ett relä behövs (bevisat)
CORS-test på riktig origin visade: `api.github.com` tillåter browser-CORS (skriv funkar
direkt), men GitHubs **token-endpoints** (`github.com/login/*`) är CORS-blockerade. Så
en ren statisk sida kan inte slutföra device-flow/OAuth själv — den behöver ett litet
**secret-löst relä** (dum proxy för de två token-anropen). Reläet håller ingen data och
ingen state → en dörrvakt, inte ett lager. USP:en intakt.

## Skiss
- **Device Flow** (inget client secret) via ett secret-löst relä. Fyra steg: sidan ber om
  `device_code` (via reläet), visar `user_code`, användaren godkänner på github.com,
  sidan pollar token-endpointen (via reläet). Därefter går alla skrivningar direkt till
  `api.github.com` som vanligt.
- **Gratis på Cloudflare-instanser:** board-Workern *är* reläet. Kostar dock att Workern
  slutar vara ren assets-Worker — `wrangler.jsonc` får ett `main`, skriptet måste ur
  bundlen via `.assetsignore`, och `check-bundle.mjs` + `export-product.mjs` ärver det.
  **Samma engångskostnad som `instant-cross-repo-sync-opt-in`** — den av dem som byggs
  först betalar den.

## Friktionen är registreringen, inte reläet
Device Flow kräver ett `client_id`, alltså en **registrerad GitHub App per instans**.
Det steget försvinner inte av att forkaren är utvecklare, och det är vad som återstår när
reläet är gratis. Skeppas som "registrera en egen app, fem minuter, här är callback-URL:en".

## Ett delat community-relä är uteslutet
Inte av principiell renhet, utan för att steg 4 i flödet **är** credential-överlämningen:
reläet är mottagaren av svaret som innehåller token:en. Det finns ingen kryptografisk
konstruktion som döljer en svarskropp för den proxy som hämtar den. Ett device-flow-relä
är minimalt i kod och maximalt i förtroende, och de två egenskaperna sitter i samma anrop.

Det som *går* är att göra token:en mindre värd att stjäla — **GitHub App i stället för
OAuth App** ger user-to-server-tokens som går ut på 8 timmar och bara når de repon appen
är installerad på. Det förvandlar "permanent full åtkomst" till "åtta timmar på de repon
jag valde", men tar inte bort att en främlings credential passerar min server. För ett
sidoprojekt betyder det incidenthantering och loggpolicy jag inte vill äga åt andra.

## Avgränsning
- Rör inte skriv-vägen (den är client-side, klar i `gui-editing`). Bara token-*hämtningen*.
  `openTokenPanel` får en knapp; `setGhToken` förblir enda skrivaren.
- Multi-användar-behörighet = git/PR-review, inte ett eget rättighetslager.

## Varför `later` och inte `next`
Den stod i `next` med `priority: high` och var därmed huvudet på produktkön, på ett bräde
med en enda författare. Motiveringen var att den blockerar
`mina-vyer-personliga-vyer-i-en-gist` — men den pucken argumenterar själv utförligt för
att den *inte* ska byggas än ("behovet finns inte än … `board.config.json` är redan
kontobundna vyer för en ensam författare"). Att låsa upp något som med flit är parkerat är
inget skäl att bygga.

Den kommer tillbaka när det finns en andra läsare av tavlan, eller när någon annan faktiskt
forkar och fastnar på token-steget.

## Öppna frågor
- Device Flow (klumpigare UX, ingen secret) vs OAuth-web-flow (snyggare, secret i relä)?
- Är app-registreringen i sig avskräckande nog att äta upp vinsten mot paste-token?
