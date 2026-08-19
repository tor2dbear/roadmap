---
title: "AI-first GUI: cockpit, inte kort-editor"
status: done
tags: [product, ui]
updated: 2026-08-19
created: 2026-08-17
order: 36
---

## Mål
Definiera vad människan faktiskt ska göra i GUI:t när verktyget är **AI-first**.
Om agenter skriver och utför pucker är det orimligt att optimera GUI:t för att
*handskriva kort*. GUI:t = en **cockpit för att styra agenter**, inte en editor.

## Arbetsfördelning
- **AI gör:** skriva body (mål/research/frågor), bryta ned, länka issues, fylla
  beroenden, hålla status ärlig, utföra jobbet.
- **Människan gör (högt värde):**
  1. **Fånga intent** — en rad, "jag vill X".
  2. **Prioritera** — ordning, now/next/later, vad som är viktigt.
  3. **Triage** — godkänn/slå ihop/arkivera, rensa drift-flaggor (⚠).
  4. **Överblick** — vad är klart att ta, blockerat, driftande, in-flight.
  5. **Dispatch** — "lämna till AI": peka på en puck, agenten kör, du ser resultatet.

## Reframe (det som gjorde den byggbar)
Ingen AI-runtime på den statiska sidan. **New = capture, inte ett AI-anrop.**
Människan fångar (en rad) + markerar (routar till en disciplin); expansionen sker
**out-of-band** när du sitter i repot med en AI. Markören *är* kön (pucker med
`agent:`, läst ur git). Tillståndet finns — **du är köraren**.

## Delivered
De fem jobben, mot vad som skeppats:
- **Fånga intent** ✅ — ⌘K quick-capture + ett enat capture-flöde (titel + repo +
  valfri kontext). Metadata sätts på pucken.
- **Prioritera** ✅ — `priority`-fält (urgent/high/medium/low), dra-och-släpp mellan
  status-kolumner, in-kolumn "+".
- **Triage** ✅ — Inbox som egen yta; drift-flaggor (⚠ + "Needs attention"-vy);
  `cancelled`-status + Delete. *(Slå ihop/dedup: ännu ej.)*
- **Överblick** ✅ — Ready (ej blockerad), Needs attention (drift), `blockedBy` på
  korten.
- **Dispatch (tillstånd)** ✅ — `agent:`-routing (PO-lagret) = den git-native kön en
  runner läser. Aktivitet = commits (Activity-fliken), tunt via GitHub.

## Medvetet ej byggt (eget spår)
Kräver en runtime en statisk zero-backend-sida inte kan hosta:
- **Auto-AI-expansion** av body (capture → AI *skriver* pucken automatiskt).
- **Dispatch-körning** — något som faktiskt *startar* en agent på en `agent:`-puck.

Båda hänger på samma bit: en **out-of-band runner** (GitHub Action-trigger eller
ett relä à la `sign-in-with-github-via-relay`). Filas separat när/om automatisk
körning blir aktuell — men designen står: markören är kön, körningen är valfri.

## Öppna frågor (kvar för runner-spåret)
- Minsta "capture → AI expanderar"-loopen som håller zero-backend (Action vs relä)?
- Hur startar man en agent från en statisk sida utan runtime?
- Triage: slå ihop/dedup av pucker i GUI:t — värt att bygga?
