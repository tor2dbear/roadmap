---
title: "Etapp heter parent"
status: now
tags: [ui, dx]
updated: 2026-09-02
created: 2026-09-02
priority: high
target: 2026-09-08
owner: tor2dbear
parent: hierarkin-pa-riktigt
---

## Goal

Tavlan kallar en puck med barn för *etapp* — samma ord som produkten heter. Byt till
**parent**, som är vad filen och payloaden redan säger.

## Research

Ordet sitter grundare än det ser ut. **Formatet är redan rätt:** det författade fältet
är `parent:`, payloaden bär `parent` / `parentRef` / `children` / `progress`. Ingen
`.md`-fil behöver ändras. Relationen är dessutom redan omdöpt — raderna heter *Part of*
och *Contains* sedan ett tidigare pass.

Kvar står ordet bara som **substantiv**: grupperingens etikett (`Etapp`, `No etapp`),
vyn (`Etapps`), och chippet på kortet. Av 170 rader i `app.js` som nämner det är
**114 kommentarer**; det synliga är ungefär ett dussin strängar.

**Två saker gör det till mer än en smakfråga:**

- Ägaren av verktyget hittade inte sin egen funktion. Gruppering på parent har funnits
  hela tiden; namnet dolde den.
- **"No etapp" innehåller alla etapper.** En rot saknar förälder och hamnar där — som
  kort, samtidigt som den är en egen kolumn. Med `No parent` läser det rätt.

**Inte `epic`**, trots att `epic:` redan är en accepterad alias: både koden och
CONVENTION går ur vägen för att säga att det inte finns någon epic-post att öppna, och
"epic" är precis ordet som får en läsare att förvänta sig en. Behåll det som
inmatningsalias, inte som visningsord.

## Open questions

- `is:etapp` och `?view=etapps` ligger i delade länkar och i sparade vyer i
  `board.config.json`. `FIELD_ALIAS` visar mönstret för fält; `is:`-värden behöver
  samma kanonisering så bägge stavningarna funkar. Utan den vaknar en sparad vy som
  inte matchar något.
- Ska CSS-klasserna (`etapp-chip`, `is-etapp`) och ikonnamnet byta med? De syns inte,
  men lämnas de kvar står ordet i koden för alltid.
