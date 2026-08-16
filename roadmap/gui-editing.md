---
title: Redigera pucks direkt i GUI:t
status: later
tags: [ui, api, editing]
updated: 2026-08-16
order: 30
---

## Mål
Kunna skapa nya pucks och flippa status direkt från tavlan — särskilt från mobilen,
när man inte står i ett repo-checkout. CLI:t täcker "i repot"; GUI:t täcker "på språng".

## Beslut
- **Sanningen stannar i källrepona.** GUI:t skriver tillbaka `roadmap/<slug>.md` via
  GitHub — det gör bara det CLI:t gör, fast från webben. Ingen separat "edit-databas"
  (det vore en andra sanning — samma anti-mönster vi undvek i auto-status).
- **Skriv-vägen kräver en liten inloggad backend** — en statisk sida kan inte skriva
  till GitHub själv. Lös med en `api/`-Worker (Cloudflare) med en GitHub-token som
  hemlighet — exakt meta-matics mönster (sajt + `api/`-Worker).

## MVP-omfattning
- Status-knappar på varje kort: start / next / later / done.
- "＋ Ny puck": välj projekt, titel, status, taggar.
- Redigeringsläge som bara syns för mig; alla andra ser läsläge.
- **Utanför MVP:** dra-och-släpp, redigera brödtext, koppla issue i efterhand.

## Arkitektur
```
Tavla (publik, läs) ──klick──▶ /api/*  (Worker, skyddad, har GitHub-token)
                                  └─▶ commit roadmap/<slug>.md i rätt repo
                                        └─▶ (valfritt) trigga ny skörd → färsk ~1 min
```
- **Endpoints:** `POST /api/status {repo,slug,status}` (byt `status:`-raden, bumpa
  `updated:`), `POST /api/puck {repo,title,status,tags}` (skapa fil ur mallen). Via
  GitHubs Contents-API; skriver till varje repos default-branch (portfolio = `master`).
- **Säkerhet:** token som Worker-hemlighet (aldrig i webbläsaren); `/api/*` bakom
  Cloudflare Access (mejl-gated till mig). Läs-tavlan förblir publik.
- **Fördröjning:** optimistisk UI (kortet ändras direkt vid lyckad skrivning) + valfri
  re-skörd-trigger så den riktiga datan hinner ikapp.

## Förarbete (manuellt, kan ej automatiseras)
- Fin-grained GitHub-token med `contents:write` på de sex repona → `wrangler secret`.
- Cloudflare Access på `/api/*`.

## Beroende / ordning
Rider på deploy-förenklingen ("sluta committa data + slå ihop skörd/deploy") — den gör
tavlan till en app med en `api/`-Worker, vilket skriv-vägen står på. Ta den förenklingen
först, sen den här ovanpå.

## Öppna frågor
- GitHub-app i stället för PAT om det ska skala till fler/andras repon?
- Räcker Cloudflare Access, eller vill vi ha en enklare lösenfras som fallback?
