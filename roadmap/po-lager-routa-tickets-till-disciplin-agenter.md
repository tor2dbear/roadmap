---
title: "PO-lager: routa tickets till disciplin-agenter"
status: done
tags: [product, ai]
updated: 2026-08-17
created: 2026-08-17
order: 37
---

## Mål
Låt människan agera **PO**: dela ut tickets till agenter med rätt kompetens
(backend, frontend, design, research). Hand-to-agent är då inte "kör Claude" utan
**"routa till rätt specialist."** Verktygets naturliga form som AI-first PM.

## Passar redan git-modellen (det eleganta)
- **Discipliner = taggar.** Puckar har redan `#backend`, `#ui`, `#design`,
  `#research`, `#ops` — det ÄR disciplin-signalen. Ingen ny datamodell.
- **Agent-profiler i git.** En `agents/`-mapp: `agents/backend.md`, `agents/design.md`
  … var och en med instruktioner / verktyg / modell för rollen. Truth-in-git.
- **Dispatch = skriv state.** Hand-off skriver `agent: backend` på pucken (eller
  runnern läser puckens taggar och väljer profil).
- **Runnern = Claude Code på ett schema.** En körning läser `roadmap.json`, hittar
  puckar med `agent:` satt, laddar matchande profil, gör jobbet, öppnar PR. **Noll ny
  backend** — bara en cron + git.

## Cockpit blir en PO-konsol
- Per-disciplin-köer: "klart för backend-agenten", "design väntar".
- `owner:` blir "vem äger — människa *eller* agent".
- Dela ut tickets lika enkelt som status-flip idag.

## USP-vakter
- Håll det **tunt**: profiler + state i git, runnern pollar. Bygg **inte** en
  schemaläggare / kö / orkestrerings-motor — det vore ett andra system. "Kön" =
  puckar med `agent:` + status; runnern läser git.
- Aktivitet = commits / PR / agent-körningar (som `ai-first-gui` säger), inte en feed.

## Sekvens
1. **Hand-to-agent** (skriv `agent:` + disciplin, GUI-affordans) — första tegelstenen.
2. **PO-lagret** (disciplin-profiler i git + routing + disciplin-köer) — visionen.

## Öppna frågor
- Var bor profilerna — per instans-repo (`agents/`) eller i produkten som exempel?
- `agent:` som en handle (`agent: backend`) vs härleds ur taggar — eller båda?
- Runnern: en generell Claude-cron i instans-repot, eller per-disciplin-körningar?
- Hur undviker vi att PO-konsolen blir "en sämre Linear/Jira" — vad *avstår* vi?

## Delivered
Den git-nativa PO-lager-kärnan är byggd (dispatch = ett commit, ingen ny motor):

- **`agent:`-fältet** — routing-state i pucken, hela vägen: `adapters.mjs` +
  harvester (digest-glyf `→ agent`), `roadmap agent <slug> <disciplin>`-CLI (+`--clear`),
  dokumenterat i `CONVENTION.md`/`AGENTS.md`/`CLAUDE.md`.
- **PO-konsol i GUI:t** — routa lika enkelt som en status-flip: en editerbar
  **Agent**-rad (picker: disciplinerna + de som redan används), badge på kort/rader,
  och en **Agents-sektion i sidomenyn** = per-disciplin-köer (räknare + filter).
  "Kön" är bara pucks med `agent:` satt, läst ur git.
- **Disciplin-profiler i git** — `agents/` med README (routing-modell + runner-mönster)
  och exempel `backend.md` / `design.md`. Byts ut mot egna i ett instans-repo.

## Medvetet utelämnat (USP-vakt)
- **Runnern körs inte här.** Den är en Claude-Code-**cron i instans-repot** som
  läser `roadmap.json`, plockar pucks med `agent:`, laddar profilen, jobbar i
  källrepot och öppnar PR. Mönstret är dokumenterat i `agents/README.md`; själva
  schemat är deploy-specifikt (och en avsiktlig icke-produkt-del).
- Ingen scheduler/kö/dispatcher, inget per-agent-aktivitetslager — aktivitet =
  commits/PR (Activity-fliken läser redan den historiken).

## Svar på de öppna frågorna
- Profiler: **i produkten som exempel** + byt ut per instans-repo. `agent:` = **explicit
  handle** (medvetet val, inte härledd — routing ska vara en avsiktlig handling).
