---
title: "Markdown-konformans (tillfällig)"
status: inbox
tags: [ui, test]
updated: 2026-09-01
created: 2026-09-01
---

## Vad detta är

**Tillfällig puck — tas bort innan grenen mergas.** Den finns för att PR-previewen
ska rendera hela markdown-ytan på en riktig telefon, och dess kropp är ordagrant
`tests/markdown.fixture.md` — samma text som assertions i `tests/markdown.test.mjs`
mäter, så det som testas och det som betraktas inte kan glida isär.

Allt nedanför den här rubriken är fixturen.
<!--
Konformanstexten för renderMd: en puck-kropp som rör vid varje drag tavlan lovar,
och vid de drag den *inte* lovar — de senare finns här för att bevisa att de
renderas platt i stället för hopklistrade.

Filen är källan både för assertions i markdown.test.mjs och för den tillfälliga
puck som PR-previewen visar, så det som testas och det som betraktas är samma text.
Kommentaren ovan är HTML och renderas därför som text på tavlan — det är avsiktligt:
esc() är först, och att den syns är beviset.
-->

## Rubriker och brödtext

Ett stycke som är mjukbrutet över två rader ska bli **en** rad på skärmen, inte
två, eftersom författare bryter vid 80 tecken av vana.

### En trea

#### En fyra

## Emfas och kod

Enkel **fet**, enkel *kursiv*, och **fet med *kursiv* inuti** — den sista är den
som förr lämnade sina asterisker på skärmen.

Kodspann skyddar sitt innehåll: `**inte fet**`, `*inte kursiv*` och
`https://inte-en-lank.example` ska stå kvar precis som de skrevs.

## Länkar

En skriven länk: [tavlan](https://roadmap.tor2dbear.com) mitt i en mening.

En bar URL: https://roadmap.tor2dbear.com/ mitt i en mening, och en i slutet av
en mening: https://example.com/a.

## Listor

- Första punkten
- Andra punkten, mjukbruten över
  två rader
- Tredje punkten
  - En nivå in
  - Och en till på samma nivå
    - Två nivåer in
- Tillbaka på toppnivån

1. Ett
2. Två
   - En osorterad under en sorterad
3. Tre

3. En lista som återupptar vid tre

## Kodblock

```
| en tabellrad i ett kodblock |
> ett blockcitat i ett kodblock
- en lista i ett kodblock
**inte fet**
```

## Tabeller

| Drag | Förekomster | Status |
|---|---:|:---:|
| tabell | 17 | ✅ |
| `nästlad emfas` | 7 | ✅ |
| **blockcitat** | 7 | ✅ |

Den tomma rubrikformen, som demofixturen använder:

| | |
|---|---|
| fixturens ålder | 13 dagar |
| sparade vyer | saknades |

## Det vi inte renderar

En tabell utan avgränsarrad är ingen tabell:

| a | b |
| c | d |

De fyra raderna ovan ska stå kvar som fyra rader, inte klistras till en mening.

> Ett blockcitat över
> två rader.

En tematisk brytning står kvar som text, på egen rad:

---

Och ett stycke efter den.

## Escaping

En tagg: <script>alert(1)</script> och en ampersand: A & B. Båda ska synas som
text, inte verka.
