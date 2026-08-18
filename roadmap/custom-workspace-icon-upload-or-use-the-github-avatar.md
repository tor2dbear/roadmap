---
title: Custom workspace icon (upload or use the GitHub avatar)
status: later
tags: [product, ui, gui]
updated: 2026-08-18
created: 2026-08-18
---

## Mål

Göra workspace-ikonen (idag den fasta git-merge-glyfen högst upp i sidomenyn)
utbytbar per instans — så en deploy-your-own kan bära sin egen identitet istället
för Etapp-märket. Två vägar: (a) sätt en egen ikon (emoji eller bild), eller
(b) använd GitHub-kontots/orgens avatar automatiskt.

## Research

- **Slotet finns redan:** `#brandMark` renderar `icon("merge")` (app-glyfen). Gör
  den överskrivbar via config istället för hårdkodad.
- **Git-native, ingen andra sanning:** ett `icon`-fält i `board.config.json`
  (samma ställe som `title`/`description`, redan redigerbart via Settings-panelen
  som skriver den filen). Värdeformer:
  - en **emoji** (`"🚀"`),
  - en **bild-URL** (self-hostad asset i repot),
  - sentinel **`"github"`** = hämta avataren från GitHub.
- **`"github"`-varianten:** `repoUrl` ger owner → `api.github.com/users/<owner>`
  (eller `/orgs/<owner>`) → `avatar_url`. Funkar för både personkonto (tor2dbear)
  och org (Acme). Ingen token krävs för publika avatarer.
- **Fallback-kedja:** config-ikon → GitHub-avatar (om owner går att härleda) →
  git-merge-glyfen (default). Faviconen kan följa samma ikon.
- **Passar Settings-panelen:** lägg "Icon" i Workspace-sektionen (emoji / URL /
  "use GitHub avatar") som skriver `icon` till `board.config.json`.

## Öppna frågor

- Ska faviconen också spegla den valda ikonen, eller bara sidomenyns märke?
- Bild-ikon: kräva kvadratisk/rund-maskning? Storlek/optimering vid URL?
- Org vs personkonto: auto-detektera (`/users` vs `/orgs`) eller låta config säga
  vilket?
