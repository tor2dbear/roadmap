---
title: Vakten underhålls i två kopior
status: later
tags: [tooling, ci]
updated: 2026-08-31
---

## Goal
`scripts/check-bundle.mjs` ska finnas på ett ställe och nå de andra genom generering,
som allt annat verktyget skickar vidare.

## Research

Filen finns i **tre exemplar**, och bara ett av dem är skrivet på rätt sätt:

| var | hur den kom dit |
|---|---|
| `tor2dbear/roadmap` | skriven — originalet |
| `tor2dbear/etapp` | **genererad** av `export-product.mjs` |
| `tor2dbear/etapp-site` | **skriven för hand**, hållen lika med originalet av någon som minns |

Den tredje raden är problemet. Produkten får sin kopia gratis vid varje spegling; sajten
får sin genom att en människa kopierar rätt.

### Att de glider isär är mätt, inte befarat

Det har redan hänt en gång. Kopian i sajten hade en bugg som originalet aldrig kunde
visa (2026-08-29): mönstret matchades segment för segment, så `demo/data/build.mjs`
jämfördes mot `demo`, `data` och `build.mjs` var för sig och matchade inget. Inget
mönster i roadmaps egen `.assetsignore` har ett snedstreck, så dess kontroller kunde
inte se felet.

Och en gång till, åt andra hållet (2026-08-31): `auditBundle()` krävde att roten slutade
med snedstreck, upptäckt i sajten och lagad i **båda** — för hand, i två commits, i två
repon, i samma session.

### Det avgörande fyndet: bara halva filen ska delas

En diff mellan de två skrivna kopiorna:

```
167 rader vardera
 20 rader skiljer
 20 av 20 är antingen en kommentar eller SERVED-kartan
```

**Regelverket är identiskt tecken för tecken.** Mönstermatcharen, git-läsningen,
katalogvandringen, rapporteringen — allt.

Filen är alltså redan två saker som råkat hamna i samma fil:

- **~140 rader regelverk** som ska vara lika överallt, och som är det idag av tur
- **~10 rader `SERVED`** som *ska* skilja sig, och som är hela poängen: roadmap serverar
  `app.js` och `data/`, sajten serverar `demo/`

Det gör den gamla frågan — *"duplicera eller hämta filen?"* — fel ställd. Det är inte
filen som ska delas, det är dess ena hälft.

### Skiss

- Regelverket till `scripts/lib/bundle-guard.mjs`.
- `check-bundle.mjs` krymper till `SERVED` plus ett anrop — den korta filen är
  instansens påstående om vad den publicerar, vilket är precis vad den bör vara.
- Lägg regelverket i `sync-product.yml`:s spegling till `etapp-site`, bredvid `app.js`
  och `styles.css`. Då blir kopian **genererad i stället för underhållen** — drift blir
  omöjlig av konstruktion, inte upptäckt av en kontroll.
- Produkten får det gratis: `export-product.mjs` kopierar redan hela `scripts/lib/`.

Det är samma lösning demodatan just fick, av samma skäl. Att *hämta* filen över nätet
vid bygget vore däremot fel form för en vakt — ett beroende som kan fallera, i det enda
som står mellan repot och en publicering.

## Open questions
- Kostar det läsbarhet? Den som öppnar `check-bundle.mjs` i sajten ser femton rader och
  måste leta upp resten. Vinsten är att den inte längre kan ha fel; förlusten är att den
  inte längre förklarar sig själv på plats. En kommentar som pekar på originalet räcker
  troligen, men det är en gissning.
- Ska `SERVED` valideras mot repots faktiska träd vid bygget? En regel som inte matchar
  någon fil är antingen inaktuell eller ett tecken på att en fil försvunnit — men filens
  egen kommentar säger att inget i `SERVED` *måste* finnas (en instans utan `_headers`
  är inte trasig). Sajtens nya svit kollar det för sitt eget repo; frågan är om det hör
  hemma i vakten själv.
