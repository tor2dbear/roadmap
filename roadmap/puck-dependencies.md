---
title: Beroenden mellan pucks (blocked-by)
status: done
tags: [core, product, ai]
updated: 2026-08-16
order: 36
---

## Levererat
`depends: [slug]` i frontmatter → harvestern resolver `blockedBy[]` (samma-repo
beroenden som inte är `done`). Tavlan visar ⛔-badge på kort/listrader, modalen en
"Blockerad av"-rad med klickbara länkar till blockerarna, och digesten en
`⛔ blocked by`-rad. `blockedBy` ligger i payloaden så agenter kan läsa "redo att
ta" = oblockerade now/next. Ingen andra sanning — fält + beräkning, som auto-status.
Dog-food: `gui-editing` deklarerar `depends: [deploy-simplification]`.

## Mål
Göra beroenden maskinläsbara istället för fri prosa. När strategin specades blev
det tydligt: flera pucks *enablar/blockerar* varandra (deploy-förenkling → GUI,
portabilitet → GUI), men det syns bara i brödtexten. Verktyget kan inte visa
"blockerad", sekvensera efter beroende, eller svara på *"vad är redo att ta nu"*.

## Snitt
- **`depends: [slug, …]`** i frontmatter — pucks den är blockerad av (samma repo
  som MVP; cross-repo via fullt id senare). Ren markdown, ingen andra sanning.
- **Beräknat i harvestern:** en puck är *blockerad* om något beroende inte är
  `done`. Läggs som en signal (`blocked`) — exakt samma mönster som auto-status
  och `signals[]`, så payloaden ändras bara när det flippar (idempotens håller).
- **Tavlan:** "⛔ blockerad av X"-badge; ev. filter "visa bara redo/oblockerade".
- **Agent-nytta:** "redo att ta" = now/next som *inte* är blockerade. Kompletterar
  agent-kontraktet direkt — en agent ser vad den kan börja på utan att gissa.

## Passar USP:n
Fält i markdown + beräkning i harvestern, inget nytt lager. Stärker agent-vinkeln.

## Avgränsning (medvetet EJ)
- Ingen separat prio-nivå (P0/P1) — `status` + `order` uttrycker prio; severity-
  nivåer drar mot PM-tool-bloat (cede-listan).
- Ingen "refinement"-status — `inbox → later/next`-livscykeln täcker det redan.
