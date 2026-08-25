---
title: Multi-provider (GitLab m.fl.)
status: later
tags: [product]
updated: 2026-08-24
created: 2026-08-17
order: 34
parent: productize
---

## Mål
Låt Etapp köra på fler git-värdar än GitHub — GitLab först. Grundidén (markdown-pucks
i git, statisk tavla) är leverantörs-agnostisk; det är bara kringlagren som är
GitHub-flavored idag.

## Vad som redan är portabelt
- **Tavlan** (index.html + app.js + styles.css) — ren statik, host-agnostisk.
- **Skörden** via `fs`-backend (`ROADMAP_LOCAL_ROOT`) — läser lokala kloner oavsett
  var de kom ifrån. CI klonar redan källorna innan skörd, så själva harvesten bryr sig
  inte om leverantören.

## Vad som är GitHub-specifikt (att porta)
- **CI-filen** (`sync.yml`) — GitHub Actions-syntax → behöver en GitLab CI-motsvarighet.
- **Issue-status-koll** — reconciliation mot GitHubs API. Gör den valfri/pluggbar
  (per-provider adapter) så en GitLab-körning inte kräver den.
- **GUI-skriv** (`gui-editing`) — `api.github.com`. En GitLab-instans skulle skriva mot
  GitLabs API i stället; CORS-läget där behöver eget test.
- **Deploy** — GitLab Pages i stället för GitHub Pages/Cloudflare.

## Avgränsning
Inte dag ett — men arkitekturen förhindrar det inte. Sekvens: gör `sync.yml`-deployen
och issue-kollen pluggbara, lägg sen en GitLab-profil bredvid GitHub-profilen.

## Öppna frågor
- Abstrahera en "provider"-modul (klona/commit/issue/deploy) eller bara dokumentera en
  GitLab-fork-variant?
- Efterfrågan: bygg först när någon faktiskt vill köra på GitLab, eller proaktivt?
