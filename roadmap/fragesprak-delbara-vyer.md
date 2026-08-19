---
title: Frågespråk + delbara vyer
status: inbox
tags: [ui, ai]
updated: 2026-08-19
created: 2026-08-19
---

## Goal
Göra tavlan frågbar och dess vyer delbara — så både en människa och en agent kan
säga "allt som är blockerat i PIA" och skicka den vyn vidare som en länk.

## Research
Läsvägen är trubbigare än resten av verktyget:

- **Sök = substrängmatchning.** `matches()` slår ihop `title + body + tags +
  repoName` till en sträng och gör `indexOf`. Inga fältfrågor (`status:now
  agent:backend blocked:no`), inga negationer, inga sparade vyer.
- **Vy-state ligger i localStorage, inte i URL:en.** `roadmap-view`, `roadmap-sort`,
  scope och filter överlever en omladdning men går inte att dela. Man kan länka till
  en enskild **puck** (hash) men inte till en **vy** — märkligt för ett verktyg vars
  poäng är att mata agenter och klistra in kontext i en chatt.
- **Färskhet:** harvest en gång i timmen. En GUI-skrivning uppdaterar din egen flik
  optimistiskt, men en annan enhet eller en omladdning ser upp till en timme gammal
  data. (`instant-cross-repo-sync-opt-in` ligger i `later` och löser halva detta.)
- **Agenter utanför ett checkout** har bara en statisk JSON. MCP-servern lämnades
  medvetet som "ev." i `agent-native-contract` och byggdes aldrig — en agent i ett
  annat verktyg kan läsa men inte fråga, och inte skriva utan att klona.

### Snitt (i storleksordning)
1. **Vy-state i URL:en** — `?view=ready&repo=pia-terminal&tag=fs&sort=updated`.
   localStorage blir default, URL:en vinner när den finns. Billigast av allt och
   löser "dela en vy" direkt. `history.replaceState` används redan för hash.
2. **Fältfrågor i sökrutan** — `status:`, `repo:`, `tag:`, `agent:`, `owner:`,
   `priority:`, `blocked:yes|no`, `is:flagged`, fri text för resten. Ren
   klient-parsning ovanpå `matches()`; ⌘K-paletten är redan extensibility-ytan.
3. **Sparade vyer** — namngivna frågor i `board.config.json` (konfiguration, inte
   sanning) som dyker upp i sidomenyn bredvid Vyer. Instansens egna, versionerade i
   git som allt annat.
4. **Samma språk för agenter** — dokumentera frågesyntaxen i `AGENTS.md` och låt
   `data/roadmap.json` + en liten query-hjälpare dela grammatik med GUI:t. Då blir
   "vad ska jag jobba på?" en sträng i stället för ett `node -e`-recept.
5. **MCP-servern (egen puck om det blir aktuellt)** — `list / read / update puck`
   över samma frågespråk, skriver via git-vägen. Nämnd som kvarvarande i
   `agent-native-contract`.

## Open questions
- Egen mini-parser eller GitHub-liknande syntax rakt av? (Förslag: GitHub-lik —
  ingen behöver lära sig något nytt.)
- Sparade vyer i `board.config.json` (delas av alla som ser tavlan) eller i
  localStorage (personliga)? Båda? Config-vägen är den git-nativa.
- Ska URL-vyn också bära `q=` fritext, eller bara strukturerade filter?
- Färskhet: räcker "hämta `roadmap.json` med cache-buster vid fokus" för att dölja
  timglappet, eller är det `instant-cross-repo-sync` som måste komma först?
