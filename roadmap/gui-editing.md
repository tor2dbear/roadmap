---
title: Redigera pucks direkt i GUI:t
status: done
tags: [ui, editing]
updated: 2026-08-18
order: 30
---

## Mål
Skapa nya pucks och flippa status direkt från tavlan — särskilt från mobilen, när
man inte står i ett repo-checkout. CLI:t täcker "i repot"; GUI:t täcker "på språng".

## Beslut (uppdaterat efter CORS-test)
- **Sanningen stannar i källrepona.** GUI:t skriver tillbaka `roadmap/<slug>.md` via
  GitHub — det gör bara det CLI:t gör, fast från webben. Ingen separat "edit-databas".
- **Skriv sker browser-native — ingen backend.** Testat skarpt: `api.github.com`
  tillåter browser-CORS, så tavlan kan committa direkt från webbläsaren med en token.
  (Den gamla `api/`-Worker-antagandet behövs inte.) Se auth nedan.

## Auth (den enda knuten — löst i två nivåer)
- **v1 – paste-token (zero-backend, default):** användaren klistrar in en fine-grained
  GitHub-token (`contents:write`, begränsad till sina repon), sparas i `localStorage`.
  Räcker för mig och self-hostande forkare. Inget att hosta.
- **v2 – "Sign in with GitHub" (valfri, egen puck):** device-flow/OAuth kräver ett
  secret-löst relä (token-endpointen är CORS-blockerad). Gratis på en Cloudflare-instans
  (board-Workern *är* reläet); hostat relä för rena Pages-forkare. → `signin-with-github-relay`.

## Arkitektur
```
Tavla (publik, läs)
  └─ redigeringsläge (bara med token) ──▶ fetch PUT api.github.com/repos/<repo>/contents/roadmap/<slug>.md
                                              └─▶ commit i rätt default-branch (portfolio = master)
                                                    └─▶ optimistisk UI: kortet ändras direkt
                                                          └─▶ (valfritt) trigga re-skörd → färsk data ~1 min
```
- **Operationer:** byt `status:`-raden + bumpa `updated:` (status-knappar); skapa fil ur
  mallen (＋ Ny puck). Samma fält-logik som CLI:t — helst delad kod.
- **Host-agnostiskt:** funkar likadant på GitHub Pages som på Cloudflare — skriv-vägen är
  client-side, oberoende av var tavlan hostas.

## MVP-omfattning
- Status-knappar på varje kort: start / next / later / done.
- "＋ Ny puck": välj projekt, titel, status, taggar.
- Redigeringsläge syns bara när en token finns; annars rent läsläge.
- **Utanför MVP:** dra-och-släpp, redigera brödtext, koppla issue i efterhand, v2-login.

## Öppna frågor
- Delad fält-edit-kod mellan CLI (`roadmap.mjs`) och GUI så de aldrig divergerar?
- Token i `localStorage` — acceptabel risk för en roadmap? (XSS kan läsa den.) Rimligt
  för lågt insatsvärde, men värt en tydlig varning i UI:t.
- Optimistisk UI + re-skörd, eller läsa data live från en endpoint?
