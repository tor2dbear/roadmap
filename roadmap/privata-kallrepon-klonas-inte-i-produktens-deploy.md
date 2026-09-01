---
title: Privata källrepon klonas inte i produktens deploy
status: inbox
tags: [product, ops]
updated: 2026-09-01
created: 2026-09-01
---

## Mål
Att `sources.json` får peka på ett **privat** repo och att tavlan då faktiskt visar dess
puckar — på den deploy produkten skeppar, inte bara när harvestern körs för hand.

## Vad som är trasigt
Skyltfönstret påstod *"A `GITHUB_TOKEN` covers private ones"*. Det gör den inte, av två
oberoende skäl:

- **`secrets.GITHUB_TOKEN` är scopad till sitt eget repo.** Den kan aldrig klona ett annat
  privat repo, oavsett hur den skickas in.
- **Klonen läser den inte ändå.** `pages.yml` sätter `GH_TOKEN` som miljövariabel, men
  steget är en naken `git clone https://github.com/$repo` utan credential-helper eller
  `extraheader`. Vanlig `git` bryr sig inte om `GH_TOKEN` — det är `gh` som gör det.

`lib/repo.mjs` *läser* `GITHUB_TOKEN`, men bara i sin **http-backend**. I CI är
`ROADMAP_LOCAL_ROOT` satt, så den vägen tas aldrig.

**Hur det faktiskt fallerar** (rättat efter granskning — jag skrev först att det sker
tyst): klonsteget kör under `set -euo pipefail`, och `git clone A || git clone B` gör B
till listans sista kommando. Misslyckas även den fallerar hela listan, `set -e` slår till
och **steget dör** — verifierat i ett skal, inte antaget. Skörden och deployen körs alltså
aldrig, och körningen blir röd i Actions-fliken.

Det som *inte* syns är sambandet. Tavlan står kvar på förra lyckade deployen (eller på
ingenting alls vid första körningen), och loggen visar ett generiskt git-autentiseringsfel
— inte "den här källan är privat och behöver en token". Felet är alltså högljutt på rätt
plats men oläsbart för den som inte redan misstänker orsaken.

Samma mönster finns i verkstadens `sync.yml` — det har bara inte märkts, eftersom källorna
där är publika. Fixen hör hemma i båda, och `sync.yml` är den som går att verifiera på
riktigt.

## Skiss
Ge klonsteget en credential som faktiskt används:

```
git clone --filter=blob:none \
  "https://x-access-token:$SOURCES_TOKEN@github.com/$repo" …
```

med `SOURCES_TOKEN` som en **egen** secret (fine-grained PAT med `Contents: read` på
källrepona), och fallback till oautentiserad klon när den saknas — så en instans med bara
publika källor fortsätter fungera utan att sätta något.

## Säkerhetsdimensionen, som är själva skälet till att detta är en puck
En token i en klon-URL är den klassiska läckvägen:

- URL:en hamnar i `set -x`-utskrifter, i `git` egna felmeddelanden och i
  `.git/config` i arbetskatalogen. Kör inte klonsteget med `set -x`, och överväg
  `git config --global url.<...>.insteadOf` eller en `credential.helper` som läser från
  miljön i stället för att bädda in den i URL:en.
- Actions maskerar bara *registrerade* secrets, och maskeringen är textmatchning — en
  token som blivit URL-kodad eller delad över radbrytning slinker igenom.
- Med `--filter=blob:none` hämtas blobbar lat, alltså sker fler autentiserade anrop senare
  i körningen än man tror.

## Avgränsning
- Rör inte harvestern eller adaptrarna. Det här är enbart hur källorna hämtas.
- Ingen ny konfigurationsyta i `sources.json` — ett repo är privat eller inte, och det
  behöver inte stå skrivet.

## Öppna frågor
- En secret för alla källor, eller `per-source`-token? En räcker för det kända fallet, och
  flera skulle betyda en nyckelhanterare vi inte vill ha.
- Räcker det att klonen lyckas, eller ska felet också bli läsbart? Detektionen finns redan
  — jobbet blir rött — så det som saknas är att loggen säger *vad* som är fel. Ett eko i
  klonsteget ("clone failed for <repo> — private sources need SOURCES_TOKEN") är billigare
  än något i tavlan, och hamnar där någon redan tittar.
- Ska produktens README säga hur man mintar token:en, eller räcker felmeddelandet ovan?
