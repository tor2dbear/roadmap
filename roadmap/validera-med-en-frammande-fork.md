---
title: Validera med en främmande fork
status: later
priority: high
tags: [product, adoption]
updated: 2026-08-30
---

## Goal
Få **en person som inte är jag** att deploya sin egen bräda, och läsa av var de
fastnar. Varje puck i `later` är i dag ett antagande om vad någon annan behöver.

## Research

Det här är ingen ny idé — det är efterlämningen två levererade puckar båda namngav
och ingen av dem gjorde.

`portability-for-others` (done 2026-08-24) skriver under **Kvar**:

> Ett `template`-repo ("Use this template"), och **att faktiskt validera med en
> främmande fork**.

`productize` (done 2026-08-25) listar under **Follow-ups**: markera
`tor2dbear/etapp` som GitHub-template, deploya ett demo för Etapp, publicera
CLI:t på npm. Demot finns nu. De andra två gör inte.

### Varför det är den dyraste luckan just nu

Etapp har noll i Now och Next och 49 klara puckar på fjorton dagar. Kön är inte
stockad — den är slut. Det som återstår delar sig i två sorter, och skillnaden är
hela argumentet:

**Fyra puckar vilar på ett antagande om en användare som inte finns än:**

| puck | antagandet |
|---|---|
| `sign-in-with-github-via-relay` | att PAT-inklistring är det som stoppar folk |
| `custom-workspace-icon` | att någon vill bära sin egen identitet |
| `multi-provider-gitlab-m-fl` | att någon vill köra på GitLab |
| `mina-vyer` | att flera läsare vill ha olika vyer |

Var och en kan vara rätt. Ingen är *mätt*.

**Tre av de övriga är inte av den sorten**, och det är värt att säga rakt ut så att
den här puckens prioritet inte vilar på mer än den bär:
`markdown-rendering-genomgang` dokumenterar fel som redan är sedda i skarp text,
`doda-css-regler-som-forlorar-pa-ordning` bygger på ett mätt svep, och
`produktspegeln-ar-obevakad` beskriver en konkret CI-lucka. De väntar på tid, inte på
en användare.

**Den åttonde, `instant-cross-repo-sync-opt-in`, hör till ingendera** — och att tvinga
in den i en av högarna vore att förlora just det som skiljer den. Den vilar på ett
antagande om en användare, men användaren är *den här instansen*: den kör på mina egna
källrepon, inte på en forks. Den ställer själv frågan som avgör den — "räcker tätare
schema (var 10–15 min) egentligen, så instant aldrig behövs?" — och den frågan besvaras
av att köra brädan i två veckor, inte av att någon utifrån deployar den. Att den legat
still sedan 17 augusti är i sig en delvis mätning: ingen har saknat den.

Uppdelningen är alltså 4 · 3 · 1 över de åtta andra `later`-puckarna. Påståendet är
smalare än "hela kön är gissningar", men landar på samma tal: **halva kön handlar om
adoption och kan bara avgöras av någon utifrån**, och en enda utomstående deploy skulle
avgöra flera av de fyra på en eftermiddag — och sannolikt hitta något ingen av dem
beskriver.

### Vad som redan är på plats

`board.config.json`, deploy-your-own-guiden i README, produktrepot
`tor2dbear/etapp`, ett live-demo, och sedan i dag en bundle-vakt som gör att en
forkare inte publicerar sina `node_modules`. Vägen är alltså byggd. Den är bara
aldrig gången av någon annan.

### Möjliga första steg (billigast först)

- **Markera `tor2dbear/etapp` som GitHub-template.** Ett kryss i inställningarna.
  Utan det är "Use this template"-knappen inte där som guiden förutsätter.
- **Gå vägen själv som främling.** Ny GitHub-användare eller ren maskin, följ
  README ordagrant, notera varje ställe man måste gissa. Fångar det grövsta utan
  att någon annans tid behövs.
- **Fråga en konkret person.** Någon som redan har flera repon och en roadmap
  någonstans. En, inte en lansering.

## Open questions
- Vem? En riktig kandidat är värd mer än en plan för att hitta kandidater.
- Vad räknas som lyckat — en deployad bräda, eller en bräda de fortfarande använder
  om två veckor?
- Ska den här pucken vara en etapp med de tre stegen som barn, eller är det
  övertänkt innan någon svarat på "vem"?
