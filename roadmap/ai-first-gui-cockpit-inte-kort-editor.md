---
title: "AI-first GUI: cockpit, inte kort-editor"
status: later
tags: [product, ui]
updated: 2026-08-17
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

## Konsekvens för det vi byggt
Nuvarande ＋ (titel/status/taggar/body) är rätt *plumbing* men fel *yta* för daglig
människo-användning. AI-first-versionen: **skriv en rad → AI expanderar** till en
riktig puck. Body-redigeringen blir mest för AI/förfining, inte handpåläggning.

## USP-vakter
- **Hand-off via git, inte backend.** "Lämna till AI" = sätt ett *tillstånd* på
  pucken (tagg / `assignee: @agent` / status) som en agent bevakar och plockar upp
  **out-of-band** (schemalagd Claude-körning, egen agent). GUI:t förblir zero-backend.
- **"Aktivitet" = commits / PR:er / agent-körningar** (redan i git), inte en egen ström.
- Delad skrivväg (CLI + GUI + agent) som förut — GUI:t är människans *omdömes*-lager.

## Öppna frågor
- Vad är den minsta "capture → AI expanderar"-loopen som håller zero-backend?
  (GUI skapar stub + flagga; en agent-runner plockar upp den var/hur?)
- Dispatch: hur startar man en agent från en statisk sida utan runtime? (GitHub
  Action-trigger? En avgränsad relä-endpoint som i sign-in-pucken?)
- Överblicks-vyer: "klart att ta" (ready = ej blockerad), "driftande", "in-flight"
  — bygg som filter/vyer ovanpå befintlig data.
- Relation till `gui-evolution` (polish) — den här definierar *vad*, gui-evolution *hur det ser ut*.
