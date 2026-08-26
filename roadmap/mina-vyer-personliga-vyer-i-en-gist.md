---
title: "Mina vyer: personliga vyer i en gist"
status: later
tags: [product, ui]
updated: 2026-08-26
created: 2026-08-26
order: 35
depends: [sign-in-with-github-via-relay]
---

## Goal
Vyer som följer **kontot** i stället för webbläsaren — utan att införa ett lager som
appen måste äga.

## Research

### Appen kommer aldrig att äga ett konto
`sign-in-with-github-via-relay` slår fast formen:

> Reläet håller ingen data och ingen state → **en dörrvakt, inte ett lager**.
> Multi-användar-behörighet = git/PR-review, inte ett eget rättighetslager.

Det finns alltså ingen serversession och ingen användarpost att hänga något på.
"Inloggad" betyder *en GitHub-token i den här webbläsaren*. Frågan är därför inte
"konto eller localStorage" utan **var det lagras, givet att vi inte får ha ett lager**.

| Var | Följer dig | Privat | Backend | Finns |
|---|---|---|---|---|
| `board.config.json` | överallt | nej — alla ser den | nej | **ja** |
| GitHub gist | överallt du loggar in | halvt (secret ≠ privat) | nej | nej |
| localStorage | bara den här webbläsaren | ja | nej | delvis |
| Databas | överallt | ja | **ja** | — |

Databasen är utesluten av `CLAUDE.md` rakt av: *"if it needs a second database … it's the
wrong shape for this product."*

### Behovet finns inte än
`board.config.json` **är redan** kontobundna vyer för en ensam författare. De följer dig
till varje enhet, överlever en ny webbläsare, är versionerade i git och går att länka.
Det enda de inte ger är *avskildhet från andra som tittar på tavlan* — och på en tavla
med en författare är det inget behov.

Det blir ett behov först när flera personer läser samma tavla och vill ha **olika** vyer,
alltså i `portability-for-others` / `productize`. Därför ligger den här pucken i `later`
och inte i `next`: den löser ett problem vi inte har, och att bygga den nu vore att betala
komplexiteten före nyttan.

### localStorage är fel verktyg, av ett skäl
Det följer inte med dig. Du loggar in på en ny dator med rätt token och dina vyer är
borta. Det är samma sorts besvikelse som en tavla som ser olika ut efter F5 — precis det
`ett-minne-i-stallet-for-tva` lagade. localStorage behåller sitt nuvarande jobb: temat,
senaste layout och sortering. Per-webbläsar-bekvämligheter, inte något man saknar på en
annan maskin.

### En gist är rätt verktyg
Den är en **GitHub-primitiv**: git-backad, ägd av kontot, noll backend. Det är doktrinens
uttalade undantag — *"lean on GitHub primitives"*. Och vyer är dessutom uttryckligen
konfiguration, inte sanning, så en andra plats för dem bryter inte USP:en på det sätt en
andra plats för *pucks* hade gjort.

## Plan
- Läs och skriv en secret gist med samma `{ name, q, group, sort, layout, done, empty }`
  som `board.config.json` använder, så en vy är en vy oavsett var den bor.
- **Två sektioner i sidomenyn, inte en sammanslagen lista** — instansens vyer och mina
  vyer. De har olika ägare och olika livslängd, och att visa dem som en lista vore att
  låtsas att de är samma sak. Samma misstag som två minnen för platser.
- Gist-id:t hittas per konto (sök på en känd beskrivning) eller sparas i localStorage som
  en ren cache — förlorar man den återfinns gisten, den går inte förlorad.

## Kostnader, sagda rakt ut
- **Token-behörighet.** En fine-grained PAT behöver en separat *Gists*-behörighet på
  kontonivå. Det är ett extra steg i paste-token-vägen, men via reläet är det bara en
  scope att be om — vilket är hela skälet till att den här pucken *beror på* reläet i
  stället för att komma före det.
- **"Secret" är inte privat.** En secret gist är olistad, inte skyddad: vem som helst med
  URL:en kan läsa den. För vy-konfiguration spelar det ingen roll, men det ska stå skrivet
  i stället för att antas.

## Open questions
- Ska en personlig vy kunna *befordras* till en instansvy (en commit till
  `board.config.json`) från GUI:t? Det är den naturliga vägen från "min genväg" till
  "lagets vy", och den finns redan som skrivväg.
- Om instansen och gisten har en vy med samma namn — vinner den personliga, eller ska
  namnkrocken synas? Att tyst låta den ena skugga den andra är den sortens sak som är
  osynlig tills den förvirrar.
