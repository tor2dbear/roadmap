---
title: Tunn collaboration via GitHub-primitiver
status: done
tags: [product]
updated: 2026-08-24
owner: tor2dbear
order: 12
parent: productize
---

## Levererat
- **`owner:`-fält** (GitHub-handle) → avatar på kortet, `@handle` + profil-länk i
  modalen. Ett fält, ingen assignee-databas. (Den här pucken dog-food:ar det.)
- **Diskussion = den länkade issuen** och **behörighet = git/PR-review** fanns
  redan; dokumenterat i AGENTS.md ("closing gaps the right way").
Så den tunna samarbetsytan är på plats — helt via GitHub-primitiver, ingen andra
sanning. Realtid/notiser/aktivitetsflöde förblir medvetet utanför scope.

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
