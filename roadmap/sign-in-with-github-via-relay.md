---
title: Sign in with GitHub via relay
status: later
tags: [product, auth]
updated: 2026-08-17
created: 2026-08-17
order: 33
depends: [gui-editing]
---

## Mål
Snygg **"Sign in with GitHub"** i GUI:t för dem som inte vill klistra in en token —
den valfria uppgraderingen ovanpå `gui-editing`s paste-token-default (v2).

## Varför ett relä behövs (bevisat)
CORS-test på riktig origin visade: `api.github.com` tillåter browser-CORS (skriv funkar
direkt), men GitHubs **token-endpoints** (`github.com/login/*`) är CORS-blockerade. Så
en ren statisk sida kan inte slutföra device-flow/OAuth själv — den behöver ett litet
**secret-löst relä** (dum proxy för de två token-anropen). Reläet håller ingen data och
ingen state → en dörrvakt, inte ett lager. USP:en intakt.

## Skiss
- **Device Flow** (inget client secret) via ett secret-löst relä, eller klassisk OAuth
  (secret i reläet) om vi vill ha snyggare UX.
- **Gratis på Cloudflare-instanser:** board-Workern *är* reläet — noll extra för mig.
- **För rena Pages-forkare:** ett self-hostat eller delat relä. Ett delat relä ser
  token:en transient → tillits-fråga; dokumentera self-host som rekommendation.

## Avgränsning
- Rör inte skriv-vägen (den är client-side, klar i `gui-editing`). Bara token-*hämtningen*.
- Multi-användar-behörighet = git/PR-review, inte ett eget rättighetslager.

## Öppna frågor
- Device Flow (klumpigare UX, ingen secret) vs OAuth-web-flow (snyggare, secret i relä)?
- Erbjuda ett delat community-relä alls, eller bara self-host pga token-tillit?
