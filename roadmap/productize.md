---
title: Brand it + split product / instance
status: next
tags: [product]
updated: 2026-08-16
order: 3
---

## Goal
Turn this from "my board" into a named product others can run. `tor2dbear/roadmap`
becomes **my instance** (my sources, my pucks, my domain); a **new repo** holds the
**product** (the reusable engine, convention, CLI, UI, docs).

## Model
- **Product** = harvester + adapters + `lib/` + CLI + board UI + `CONVENTION.md` +
  `AGENTS.md` + `templates/` + generic README/examples.
- **Instance** = `sources.json` + `board.config.json` + `roadmap/` pucks +
  `wrangler.jsonc` (domain). Already separated from code via the portability work.

## How to split (keep the USP: zero-backend, no build step)
- The product is a **template repo** ("Use this template" → edit config → deploy;
  pull updates via `git merge upstream`).
- Pragmatic for a solo dev: keep iterating here (this repo is the live lab), and
  make the product repo a **generated, generic mirror** — a small sync script/Action
  copies the code + example config, minus personal bits. Avoids two diverging
  codebases; the product repo is a derived artifact.
- Publish the `roadmap` CLI to npm so authoring works anywhere without cloning.

## Name — decided: **Vantage**
A vantage point = one overview across all repos, which is exactly what the board
is. Tagline: *"git-native roadmap-as-code."* The unit stays **puck** (like
Trello/cards). Known namesake to note: `vantage.sh` (cloud-cost, different
category). Product lives at `tor2dbear/vantage`; this repo stays my instance.

## Ready-made content
The Linear/Projects comparison and the "close gaps, keep the USP" strategy are
finished positioning — they become the product README + a landing one-pager.

## Honest tradeoff
Two repos = maintenance overhead; worth it for a clean brand / external users. If
it stays just me, one well-separated repo suffices for a while. Branding itself is
cheap — do it now regardless.
