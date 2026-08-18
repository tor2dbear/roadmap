---
title: Koppla ett GitHub-issue till en puck från GUI:t
status: later
tags: [ui, editing, github]
updated: 2026-08-18
created: 2026-08-18
---

## Mål

GUI:t kan redan sätta status / priority / agent / owner / brödtext, men **inte
`issue:`**. CLI:t kan (`roadmap issue <slug> <n>`). Lägg en issue-koppling i
puck-vyn så man kan länka/avlänka ett GitHub-issue direkt från tavlan — särskilt
på mobilen, där man inte står i ett repo-checkout. Den sista lilla luckan från
`gui-editing`.

## Omfattning

- Ett fält i puck-vyns rail (bredvid owner/agent): visa nuvarande `issue:` som en
  klickbar länk (+ `issueState`-badge open/closed), eller "Link issue" när tomt.
- Skriv `issue:`-raden i frontmatter via Contents API — samma penna som övriga
  fält-editeringar, bumpa `updated`. Avlänka = ta bort raden (som agent-clear).
- Input: issue-**nummer**, eller klistra hela issue-URL:en och plocka numret.
- Efter skrivning reconcilas `issueState` vid nästa skörd → Discussion-fliken och
  drift-flaggorna (`issue-closed` / `issue-open`) uppdateras av sig själva.

## USP-vakt

Tunt via GitHub: diskussionen *är* det länkade issuet, ingen egen
kommentarslagring. `issue:` är bara en frontmatter-rad — samma sanning i git,
samma skrivväg (CLI + GUI + agent).

## Öppna frågor

- Bara nummer, eller acceptera full URL och parsa numret?
- Validera att issuet finns (extra API-anrop) eller skriv optimistiskt och låt
  drift-flaggan fånga ett felaktigt nummer?
- Antas issuet i puckens eget repo — stödja cross-repo-issue senare?
