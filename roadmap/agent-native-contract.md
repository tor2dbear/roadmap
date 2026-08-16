---
title: Agent-kontrakt (+ ev. MCP)
status: done
tags: [product, ai]
updated: 2026-08-16
order: 8
---

## Levererat
**`AGENTS.md`** — en stabil, agent-agnostisk spec: hur en agent *läser*
(`data/roadmap.json`, `signals[]`, `blockedBy[]`) och *skriver* (CLI:t / redigera
markdown), plus "redo att ta"-recept (oblockerade now/next) och invarianterna
(aldrig en andra sanning). Länkad från README + CLAUDE.md. Datan var redan
agent-läsbar; det här paketerar och gör det upptäckbart.

## Kvar (valfritt — var "ev." från början)
En MCP-server som exponerar `list/read/update puck` för agenter *utanför* repo-
checkouten. Egen puck om/när det behövs; skriver via samma git-väg.

## Mål
Göra roadmapen till något en AI-agent opererar *nativt* — läser för att veta vad
som ska göras, skriver för att markera klart — utan API-nycklar eller
tredjepartsintegration. Moaten: det Linear/Projects inte kan kopiera utan att
överge sin egen modell.

## Vad som redan finns
`data/roadmap.json` (maskinläsbart, med `signals[]` för drift), per-puck markdown,
och `roadmap`-CLI:t som en agent kan anropa direkt i repot. Grunden finns — det
som saknas är *paketering* och *upptäckbarhet*.

## Snitt
- **Dokumenterat agent-kontrakt:** en kort, stabil spec ("så här läser/skriver en
  agent roadmapen") i repot. Delvis i CLAUDE.md/CONVENTION.md idag — lyft till ett
  tydligt kontrakt en främmande agent kan följa.
- **MCP-server (ev.):** en liten MCP som exponerar `list / read / update puck`, så
  agenter i andra verktyg (inte bara i repo-checkouten) kan operera roadmapen.
  Skriver via samma git-väg — ingen andra sanning.
- **Läsbarhet:** säkerställ att `roadmap.json` + `signals[]` räcker för att resonera
  om drift och prio utan att gissa.

## Princip
Skriv alltid tillbaka till git/markdown. Kontraktet/MCP:n är en penna, inte ett lager.

## Varför tidigt
Låg insats (datan är redan läsbar — mest paketering) men hög differentiering. Billig
att claima, och det är det som faktiskt är unikt.
