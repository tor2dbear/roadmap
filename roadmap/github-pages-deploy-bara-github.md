---
title: GitHub Pages-deploy (bara GitHub)
status: done
tags: [product, ops]
updated: 2026-08-17
created: 2026-08-17
order: 31
---

## Levererat
Generatorn (`export-product.mjs`) skeppar nu **`.github/workflows/pages.yml`** som
produktens default: skörda → assemblera ren `_site/` → `upload-pages-artifact` →
`deploy-pages`. Bara GitHub krävs — ingen Cloudflare, inga secrets. `sync.yml`
(Cloudflare) borttagen ur mallen; Cloudflare blir dokumenterad opt-in
(`npx wrangler deploy`). README "Deploy your own" omskriven till Pages-flödet;
custom-domäner gratis via Pages. Validerat: giltig YAML, `${{ }}` literala, tree ok.

## Follow-ups (valfria, egna pucker om de tas)
- **Live-propagering:** befintliga `etapp` behåller sin nuvarande workflow (mirror
  speglar inte `.github/workflows` — kräver `workflow`-scope). Att sätta etapp på
  Pages är ett engångs-manuellt steg (eller bumpa SYNC_TOKEN:s Workflows-scope).
- **Flytta min egen instans till Pages** (dogfooding): kräver DNS-ompekning +
  aktivera Pages + retire Cloudflare-Workern. Frivilligt, egen risk mot live-domänen.

## Mål
Göra så att en forkare bara behöver **GitHub** för att köra Etapp — ingen
Cloudflare, inget andra konto. Cloudflare blir ett *valfritt* avancerat spår, inte
ett krav. Det var kritiken mot produkten: deployen kändes knölig pga Cloudflare-steget.

## Skiss
- Ny (eller alternativ) workflow som **deployar till GitHub Pages** med
  `actions/upload-pages-artifact` + `actions/deploy-pages`, efter skörden.
- `wrangler`/Cloudflare-deployen blir opt-in (behåll den gate:ade varianten för
  fleet/custom-Worker-behov).
- Harvestern är redan host-agnostisk (`fs`-backend läser lokala kloner), så inget i
  skörd-koden behöver ändras — bara deploy-steget.

## Custom-domän utan Cloudflare
GitHub Pages stödjer **custom-domäner gratis**. Så "bara GitHub" krockar inte med
"egen URL":
- `roadmap.tor2dbear.com` → Pages + domän (kan flyttas hit)
- `etapp.tor2dbear.com` (landning + demo på `/demo/`) → Pages + domän (behålls)
- DNS ligger kvar på Cloudflare-zonen, bara ompekad mot Pages (DNS ≠ host).
- Produktens default för forkare: `github.io`-URL (noll setup); custom-domän = valfritt Pages-steg.

## Avgränsning
- En Pages-sida per repo, en CNAME per sida — passar strukturen (roadmap-repo,
  etapp-site-repo var för sig).
- Cloudflare-proxy (orange moln) framför Pages kan strula med cert → dokumentera
  "DNS only" eller korrekt setup.

## Öppna frågor
- Skeppa Pages som *enda* default i produkten, eller båda workflowsen med Pages förvalt?
- Flytta min egen instans till Pages nu (dogfooding) eller senare?
