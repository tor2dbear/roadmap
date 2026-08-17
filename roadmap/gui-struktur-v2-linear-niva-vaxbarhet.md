---
title: "GUI-struktur v2: Linear-nivå + växbarhet"
status: now
tags: [product, ui]
updated: 2026-08-17
created: 2026-08-17
order: 38
---

## Mål
Höj cockpitens *struktur* till Linear-nivå och gör den **växbar** (kunna lägga till
fält/funktioner utan att GUI:t spricker). Efter pass 1–4 (identitet + skal) är det
lag-strukturen som är svag.

## Svagheter vs Linear (utvärderade)
1. **Sök för tung** — full-bredds sökruta. Linear = ⌘K command-palette (ikon).
2. **Topbaren blandar två jobb** — global sökrad, saknar en *konsekvent vy-header*
   (namn + räknare + vy-actions) som stannar när man öppnar puckar.
3. **Vy-toggle + Filter som lösa knappar** — hör hemma i en vy-options-meny.
4. **Detaljen är ett flödande dokument, inte en properties-rail** — skalar inte när
   fält växer. Största växbarhets-svagheten.
5. **Ingen priority, ingen keyboard-first, ingen command-palette.**
6. Densitet/polish en aning under Linear.

## Riktning
- **⌘K command-palette** — sök krymper till ikon; palette är extensibility-ytan
  (varje ny action dyker upp där, inte som fler knappar).
- **Konsekvent vy-header** — vy-namn + räknare + view-options (sort/layout); stannar.
- **Filter i sidomenyn** — repos + discipliner(taggar) = scope. Topbaren nästan tom.
- **Properties-rail i detaljen** — Status · Priority · Owner-eller-agent · Labels ·
  Blocked · Created/Updated som *diskreta rader*. Nytt fält = ny rad, inte i body.
  Detaljpanelen får en egen header (breadcrumb + titel + actions).
- **Priority som fält** — `priority:` i puck-konventionen (kopplar till `po-lager`).
- **Skalbar sidomeny** — Vyer · (Projekt/Initiatives senare) · Repos · Discipliner.

## Angreppssätt
v2-mockup först (godkänd look), sen ombyggnad i pass ovanpå nuvarande app.js/styles.

## Öppna frågor
- Command-palette utan runtime — ren client-side (fuzzy över puckar + actions)?
- Properties-rail: härled ur frontmatter; hur redigeras varje rad inline (samma
  browser-write som status/body idag)?
- `priority:` — lägg till i CONVENTION.md + harvester + `roadmap` CLI.
