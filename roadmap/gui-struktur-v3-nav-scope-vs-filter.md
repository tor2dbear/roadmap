---
title: "GUI-struktur v3: nav/scope vs vy-filter"
status: done
priority: medium
tags: [product, ui]
updated: 2026-08-17
created: 2026-08-17
order: 37
---

## Mål
Skärp IA:n efter v2 så sidomenyn = **navigation/scope** och vy-headern = **vy-filter**
(Linear-modellen). Baserat på konkret feedback mot Linear-referens.

## Svagheter som åtgärdades
1. **Sök såg ut som ett inmatningsfält men var en knapp** ("får inte input") — förvirrande.
2. **New låg i vy-headern** i stället för som primär skapa-action.
3. **All/Ready** funkade (verifierat) men *lästes* inte som en aktiv vy-väljare, och
   Ready bytte layout i smyg.
4. **Show done** låg som checkbox i sidomenyn — är ett vy-filter, inte scope.
5. **Inbox** låg som en muted kolumn på boarden i stället för en egen triage-yta.

## Delivered
- **Sidomeny = nav/scope:** user-chip · **Search**-knapp (öppnar ⌘K) + **New** (token-
  gated) högst upp · **Views**-lista (All pucks / Ready / Inbox / ⚠ Needs attention) med
  live-räknare och tydligt aktivt läge · Repos + Discipliner som scope · tema i foten.
- **Sök som riktig knapp** — fejk-inputen borta. Desktop: knapp i sidomenyn. Mobil:
  ren sök-ikon i topbaren (sidomenyn ligger bakom ☰). Båda öppnar samma palett.
- **Inbox = egen yta** — boarden visar bara committed arbete (now/next/later/done);
  `inbox`-pucks triageras i sin egen vy. Matchar konventionens "nothing here is a promise".
- **Filter-popover i vy-headern** — Show done + Priority (kopplar till nya `priority`-
  fältet), med en badge som räknar aktiva filter. Växbar yta för fler filter.
- **Breadcrumb i detaljen** — klickbar "[vy] › repo · slug" (panel behålls, board syns
  kvar — medvetet val framför Linears fullskärm).

Verifierat i headless Chromium (desktop + mobil): Views + räknare, All utan inbox-kolumn,
Inbox-vyn, filter-badge, breadcrumb, sök-knappar, topbar dold på desktop. Inga JS-fel.

## Medvetet utelämnat
Fullskärm-öppning av puckar (valde panel + breadcrump). Fler filter (status, blocked,
owner) — ytan finns, läggs till vid behov.
