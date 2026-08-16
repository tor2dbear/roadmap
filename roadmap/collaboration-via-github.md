---
title: Tunn collaboration via GitHub-primitiver
status: inbox
tags: [product]
updated: 2026-08-16
order: 12
---

## Mål
Precis så mycket samarbete som behövs — utan att bygga ett kommentars-/notis-system
(det vore en sämre Linear och en andra sanning).

## Snitt
- **Diskussion = den länkade issuen.** Pucken pekar redan på `issue:`; luta på
  GitHubs kommentarer/notiser istället för egna.
- **Ägare:** ett `owner:`-fält i frontmatter (GitHub-handle), renderas som
  namn/avatar på kortet. Ren markdown, ingen databas.
- **Behörighet:** git/GitHub styr redan vem som får skriva (PR-review, branch
  protection). Skrivning = commit.

## Utanför scope (medvetet avstått — Linears mark)
Realtids-samredigering, push-notiser, aktivitetsflöde.
