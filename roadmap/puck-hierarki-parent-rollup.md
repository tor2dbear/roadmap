---
title: "Puck-hierarki: parent + rollup"
status: done
tags: [core, product]
updated: 2026-08-20
created: 2026-08-19
order: 30
---

## Goal
Ge tavlan en nivå över pucken — så ett *utfall* (inte bara en lapp) kan ha status
och progress — utan att införa en ny filtyp eller en andra sanning.

## Research
Idag är hierarkin `repo → puck`. Repo är en **deploy-enhet**, inte ett utfall, och
det syns i datan:

- **Taggexplosion = en nivå som försöker födas.** PIA: 51 pucker / **41 distinkta
  taggar**. Méta-Matic: 18 / 16. Taggar grupperar men kan inte bära mål eller status.
  (Siffrorna är indikativa — de bygger på ett skördat ögonblick, inte på hur flitigt
  fälten används just nu.)
- **Etapp har redan epics utan att kunna säga det.** `gui-struktur-v2`,
  `gui-struktur-v3`, `ai-first-gui-cockpit`, `gui-editing`, `keyboard-shortcuts` och
  `markdown-rendering` är *ett* initiativ (cockpit på Linear-nivå). Ingen vy visar
  det som en enhet; "hur långt har vi kommit på cockpiten?" går inte att svara på.
- **Redan noterat:** `gui-struktur-v2` listar "Skalbar sidomeny — Vyer ·
  *(Projekt/Initiatives senare)* · Repos · Discipliner".

Jämförelse: Linear har Initiative → Project → Issue → Sub-issue. Att kopiera fyra
nivåer vore PM-bloat och kräver projekt-objekt med egna metadata → en fil som inte
är en puck → början på en andra sanning.

### Beslut: fältet heter `parent`, konceptet heter **etapp**
`CONVENTION.md` slår fast att fältnamnen är ett gränssnitt och ska vara engelska, och
`parent` är dessutom självrefererande — vill vi någon gång ha tre nivåer kostar det
inget extra. Men i GUI:t och i tal heter nivån **etapp**: "Etapp-vyn", "puckar i den
här etappen", en `Etapp`-rad i properties-railen.

Då får vi branding-koherensen — Etapp organiserar arbete i etapper, som Linear har
cycles — utan att dokumentationen blir tvetydig ("Etapp harvestar etapper" är
svårläst; "the `parent` field, shown as *Etapp*" är det inte). Bonus: metaforen blir
hel — en etapp är en sträcka, puckarna är markörerna längs den.

### Snitt: ett fält, samma primitiv
```yaml
parent: cockpit-linear-niva              # samma repo
parent: tor2dbear/pia-terminal#vfs       # cross-repo, fullt id
```
En puck med barn **är** epicen — ingen ny typ, ingen ny fil. Harvestern deriverar
`children[]` och en rollup (`3/7 done`) precis som den redan deriverar `blockedBy[]`
ur `depends`. Symmetriskt med det som finns, noll ny lagring.

- **Tavlan:** gruppera-på-parent i listvyn, förälder-rad + progress på epic-kortet,
  breadcrumb i detaljen (railen får en `Parent`-rad, som alla andra fält).
- **Skrivväg från dag ett:** `roadmap parent <slug> <parent>` (+`--clear`) och en
  editerbar rad i properties-railen — annars upprepas `depends`-misstaget (ett fält
  som bara går att handredigera används inte; se `beroenden-skrivvag-cross-repo`).
- **Djup:** fältet är självrefererande så godtyckligt djup är gratis, men tavlan
  renderar max två nivåer. Cykelskydd i harvestern.

## Levererat

**Ett fält uppåt, resten deriverat.** `parent:` är det enda som författas — en slug i
samma repo eller `owner/repo#slug` var som helst på tavlan. Harvestern löser den till
`parentRef`, vänder på pilarna till `children[]` och räknar `progress` `{done,total}`
ur barnens *riktiga* statusar. En lagrad `children:`-lista hade kunnat säga emot
`parent:`-raderna, och två sanningar är precis det den här produkten inte gör.

**Referensformen blev en gemensam primitiv.** `refKey()` i harvestern översätter både
`parent` och (nästa pass) cross-repo `depends`: bar slug = mitt repo, `owner/repo#slug`
= var som helst. En sak att lära sig, en sak att få rätt.

**Tavlan fick etappen som en gruppering, inte en ny korttyp.** `GROUPS.parent` gör
kolumnerna till etapper — samma renderare som status, agent, repo och target — och att
dra ett kort mellan kolumnerna skriver den ena `parent:`-raden. Kolumnhuvudet bär
etappens rollup, kortet en `1/2`-badge om det *är* en etapp och en liten etapp-chip om
det tillhör en. Railen fick en `Etapp`-rad uppåt och en `Pucks`-rad nedåt (landade barn
överstrukna).

**Frågespråket följde med utan specialfall:** `parent:auth` (alias `etapp:`), plus
`is:etapp` (har barn) och `is:orphan` (varken förälder eller barn). Etapp blev också ett
fält i filterpanelen — till skillnad från repo och agent, som är *platser*, är detta ett
riktigt fält. Bara pucks som faktiskt är etapper erbjuds; ett värde som matchar noll vore
en fälla.

**Skrivvägen fanns från dag ett** — `roadmap parent <slug> <etapp>` (`--clear`), en
`Etapp`-rad i railen, och drag-and-drop. `depends`-misstaget (ett fält som bara går att
handredigera används inte) upprepas inte.

**Trasiga länkar flaggas, lagas aldrig.** En `parent:` som inte finns ger
`parent-missing`; en som sluter en cirkel ger `parent-cycle` och länken klipps så resten
av trädet fortfarande löser ut. Två flaggor för att det är två olika fixar — en felstavning
respektive en loop.

### Beslut som bygget tvingade fram
- **Etappen har egen status; rollupen visas bredvid.** Härledd status hade gjort det
  omöjligt att parkera en etapp vars puckar ligger still.
- **Rollupen räknas om lokalt vid statusflipp.** Tavlan skriver optimistiskt, så en
  etapp som väntade på nästa skörd hade visat fel siffra i en minut.
- **Loopar vägras i GUI:t och i CLI:t**, inte bara i harvestern: att skriva en rad som
  ändå ignoreras är att skriva skräp till git.
- **Ingen `+`-knapp i etappkolumnerna.** Nya pucks tar bara repo och titel; att smyga in
  ett `parent:` där hade krävt en till fält i capture-flödet.

Verifierat: 22 fall i headless Chromium (kort, gruppering, frågespråk, filterpanel,
detaljvy, skrivväg, loopvägran) plus sex tidigare sviter som regression, och
harvestern körd mot en fixtur som täcker samma repo, cross-repo, saknad förälder,
självförälder och tvåcykel.

## Medvetet inte byggt
- **Mer än två nivåer på tavlan.** Fältet är självrefererande så djupet är gratis i
  datan, men kolumnerna renderar en nivå: en etapp och dess puckar.
- **Härledd etapp-status** — se beslutet ovan.

## Open questions
- Räcker `parent` för att stoppa taggexplosionen, eller behövs en taggstädning i
  PIA parallellt?
