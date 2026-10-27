---
title: Trycka på show Done visar även cancelled
status: done
updated: 2026-09-18
created: 2026-09-13
priority: high
tags: [ui]
---

När man trycker på show Done under hidden så visas även cancelled. Om man sedan väljer … på cancelled och sen väljer hide så döljs endast den.

## Goal

**En rad som heter `Show Done again` ska visa Done.** Rapporten är två meningar och den
andra är inte ett andra fel — den är beviset: `⋯ → Hide column` på Cancelled *döljer bara
den*, alltså gör kolumnmenyn precis det den lovar medan ögat bredvid inte gör det. Det är
asymmetrin som gör överraskningen synlig, och den står mellan två kontroller på samma bräda.

Mätt på live-datan (184 pucks, 142 done, 2 cancelled), brädan som den står:

| steg | kolumner | tray | `q` |
| --- | --- | --- | --- |
| 1. brädan | Now 0 · Next 6 · Later 23 | `Done 142`, `Cancelled 2` | — |
| 2. ögat på **Done** | … + **Done 142 + Cancelled 2** | tom | — |
| 3. `⋯ → Hide column` på Cancelled | … + Done 142 | `Cancelled 2` | `-status:cancelled` |

Steg 3 är användarens egen omväg till det steg 2 skulle ha gett.

## Research

**Orsaken är en rad.** `liftArchive()` skriver `state.showDone = true`, och det är **en**
switch för `TERMINAL` — `done` *och* `cancelled`. Trayets öga anropar
`unhideColumn(g, key, archive)`, som för en arkivdold kolumn inte har någon annan spak att
dra. Ingen bugg i `unhideColumn`s termredigering: den halvan är per kolumn och korrekt.

**Och felet är inte status-specifikt.** Med två repon som ligger helt i arkivet under
`group=repo`: trayet visar `Beta 3` och `Landed 1`, och ögat på Beta ger bägge — plus att
`Alpha` växer **5 → 7**, eftersom lyftet också visar de arkiverade korten *inne i* de
kolumner som redan stod. Det sista är oundvikligt och rätt: det är vad spaken gör.

**Vilket är det egentliga fyndet: brädan har många dörrar till ett rum, och bara en sort
skyltar om rummet.** Räknat på live-datan, kontroller som drar i samma spak:

| gruppering | trayrader | kolumnmärken | totalt |
| --- | --- | --- | --- |
| `status` | 2 | 0 | **2** |
| `repo` | 1 | 6 | **7** |
| `priority` | 1 | 3 | 4 |
| `agent` | 1 | 2 | 3 |
| `target` | 1 | 1 | 2 |

Och `CLAUDE.md` säger redan att det är meningen — *"pressing that is the same repair as the
tray's eye. Not a fourth explanation: the same door, in a nearer wall."* Många dörrar, ett
rum, avsiktligt. **Skillnaden är skylten.** Kolumnmärket säger `2 archived 👁` — ett
kategoriord som Display-menyn definierar, och som läses som en kategoriomfattande handling.
Trayraden säger `Show Done again` — ett *kolumnnamn*, och läses som en kolumnhandling.
Samma dörr, två skyltar, och bara den ena är sann om rummet.

Trayets arkivrader har alltså lånat den frågedolda radens kläder. Det är den enda raden på
brädan som namnger en kolumn och utför en kategori.

## Utfall

**Formen blev B: raderna behöll sin plats och bytte språk.** Arkivets trayrader säger
`Done 142 archived` i `archivedMark`s egna ord, och deras titel lovar kategorin
(`Show archived pucks`) där en frågegömd rad lovar sin kolumn (`Show Later again`). Två
orsaker, två meningar — och `unhideColumn` är orörd, för termhalvan var aldrig fel.

Spaken står kvar som den var, och det är hela poängen: `board.test.mjs` har sedan den
skrevs asserterat att ögat *"lyfter växeln, inte bara sin egen kolumn"*. Beteendet var
alltså känt, avsiktligt och kontrollerat — det var skylten som ljög.

**Tre kontroller, var och en sabbad för sig:** ett rent antal tillbaka faller 10; en titel
som lovar kolumnen även för en arkivrad faller 2; ett eget ord i stället för märkets
faller 10, och stavningsregeln faller från *bägge* håll — byt ordet i märket i stället för
i facket och den fälls ändå (plus tre befintliga kontroller om märket). Sex befintliga
förväntningar flyttade med premissen: varenda en var en arkivrad, ingen var en frågegömd,
vilket är kvittot på att ändringen träffar exakt det den skulle.

1239 kontroller, 0 fel.

## Vad som avsiktligt inte gjordes

- **Ögat skriver ingen term åt dig.** Mätt: kolumnen som redan står växer ändå (5 → 7),
  frågan får ett term ingen bad om, och under `group=target` finns inget term att skriva
  (`columnTerm` svarar null för en månad). Ett löfte som går att hålla i en gruppering och
  inte i en annan är inte hållet.
- **Kolumnmärkets egen mening är orörd.** `Show N archived pucks in this column` är
  ofullständig på samma sätt som `Show Done again` var — men märket bär redan
  kategoriordet synligt, vilket var det som gjorde jobbet. Om meningen också ska sluta
  hävda en omfattning den inte har är en egen fråga, och den fanns inte i rapporten.

## Open questions

*(Besvarade — se Utfall. Kvar står bara den sista.)*

- ~~**Vilken form ska arkivets trayrader ta?**~~ Tre kandidater, alla mätbara:
  - **A. Kollapsa till en rad** — `144 archived 👁`, i kolumnmärkets eget språk, med
    kolumnnamnen som underrad (`Done · Cancelled`). Ärlig om spaken, men tappar
    per-kolumn-siffrorna (142/2) och gör arkivraden till ett undantag bland trayrader.
  - **B. Behåll raderna, byt språket** — `Done 142 · archived 👁`, så varje rad namnger
    både kolumnen som fattas och kategorin som håller den. Minsta ingreppet; frågan är om
    ett ord räcker för att sluta läsas som per kolumn.
  - **C. Ögat skriver en term också** — lyft arkivet *och* dölj de andra arkivdolda
    kolumnerna med `-status:cancelled`. Håller löftet bokstavligt, men skriver en term
    ingen bad om, och håller det ändå inte: `Alpha 5 → 7` står kvar, och under `group=target`
    finns ingen term att skriva (`columnTerm` svarar null för en månad).
- **Ska kolumnmärket och trayraden bli samma kontroll?** Under `group=repo` ritas sex märken
  och en trayrad för en spak. Om svaret på frågan ovan är A, är nästa fråga om märkena är
  sju vägar in till samma sak eller om de säger olika sanna saker (*vilken* kolumn som är
  kort om vad).
- **Vad händer vid navigering?** Arkivlyftet minns per vy; en term rensas av navigering. Ett
  svar av typ C sönderfaller alltså till "bägge syns" nästa gång man kommer tillbaka.
