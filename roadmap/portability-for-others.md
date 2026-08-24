---
title: Fungera utanför mina egna repon
status: done
tags: [product]
updated: 2026-08-24
order: 5
parent: productize
---

## Mål
Göra det trivialt för någon annan att peka verktyget på *sina* repon och få ett
bräde — utan att handpyssla kod. Nordstjärnan för "utanför bubblan": det som gör
det från personligt verktyg till något andra kan använda.

## Levererat (första snittet)
- **`board.config.json`** — titel, beskrivning och source-länk ut ur koden och in
  i config; harvestern bäddar in den i payloaden, `app.js` applicerar (titel/h1/
  meta/source), digesten använder titeln. Inget "tor2dbear"-antagande kvar i den
  serverade koden.
- **"Deploy your own"-guide** i README (fork → `sources.json` + `board.config.json`
  → `wrangler.jsonc` → Cloudflare). Privata repon täckta via `GITHUB_TOKEN`.
- `board.config.json` triggar synken och hålls ur den serverade bundlen.

## Kvar (valfria följdsteg, ej detta snitt)
Ett `template`-repo ("Use this template"), och att faktiskt validera med en
främmande fork. Hostad multi-tenant förblir uttryckligen utanför scope (backend =
risk mot USP:n).

## Första snittet (MVP)
- **Config-drivet:** allt repo-/färg-/namn-specifikt bort ur koden och in i
  `sources.json` (redan mestadels där) + en liten `board.config.json` för titel,
  domän och tema. Inga hårdkodade "tor2dbear"-antaganden kvar.
- **Deploya-dina-egna:** kort guide (fork → redigera `sources.json` → koppla
  Cloudflare → klar på ~10 min). Ev. ett `template`-repo att "Use this template" på.
- **Privata repon:** dokumentera `GITHUB_TOKEN`-vägen (finns i backenden redan);
  funkar för publika och privata utan kodändring.

## Utanför MVP
Hostad multi-tenant-tjänst, konton, "lägg till repo"-GUI. Det vore en annan produkt
(och en backend = risk mot USP:n). Håll det som "kör din egen".

## Varför först
Lägst risk, ren USP-expansion (fler kör den git-nativa modellen), och breddar basen
innan skriv-vägen (GUI) läggs ovanpå.
