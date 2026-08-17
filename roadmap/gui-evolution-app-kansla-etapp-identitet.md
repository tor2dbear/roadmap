---
title: "GUI-evolution: app-känsla, Etapp-identitet"
status: now
tags: [product, ui]
updated: 2026-08-17
created: 2026-08-17
order: 35
---

## Mål
Utvärdera nuvarande tavla och höj den mot en mer polerad, app-lik GUI (referens:
Linear) — **men med en egen Etapp-identitet**, inte en Linear-klon. Nu när GUI:t
kan skriva (status + ny puck) är det värt att lyfta helheten.

## Vad vi lånar (form, inte fundament)
- **Visuell polish:** täthet, typografi, dark-first, tydliga status/priority-affordances.
- **Layout:** lista/board + en detaljpanel bredvid (inte bara modal).
- **Tangentbordsdrivet:** j/k-navigering, ⌘K-palett, snabb status-flip.
- **Agent-panel:** yta som visar agenten som jobbar på en puck (PR, diff, "worked
  for Ns"). Detta *stärker* USP:en — agent-native — snarare än att tumma på den.

## USP-vakter (det här skiljer oss — tumma inte)
- **Git är sanningen. Zero-backend. Ingen andra databas.** Så vi bygger **inte**
  Linears aktivitets-/kommentarsflöde som ett lager — den "aktivitet" vi visar är
  git-historik, PR:er och agent-körningar (som redan finns i git/GitHub).
- **Cede medvetet:** realtids-samredigering, notiser, sprints/story points, rich
  comment-feed. Bygger vi dem blir det en sämre Linear och urholkar moaten.
- Etapps egen touch: pucks-som-kod, delad skrivväg (CLI + GUI + agent),
  multi-repo-aggregering, deploy-your-own. Identiteten (trail-orange/forest, mono)
  ska kännas som Etapp, inte lånad.

## Angreppssätt
1. **Ärlig utvärdering först** — vad är svagt i nuvarande tavla (densitet, navigering,
   detaljvy, mobil)? Lista konkret.
2. **Inkrementellt, inte omskrivning** — höj i pass ovanpå nuvarande app.js/styles.css.
3. Ev. ett **designpass** (tokens, spacing, typografi) innan feature-arbete.

## Öppna frågor
- Detaljpanel vid sidan av (desktop) vs behålla modal (mobil) — hybrid?
- Hur långt in i "agent-panel" går vi utan att det kräver en runtime/backend?
- Egen identitet: hur långt från Linears mörka look ska vi ligga för att kännas Etapp?
