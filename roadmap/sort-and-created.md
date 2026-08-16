---
title: Sortering + skapad-datum
status: done
tags: [ui]
updated: 2026-08-16
order: 60
---

## Mål
Kunna sortera tavlan på fler sätt än default, och visa när en puck skapades —
inte bara när den senast rördes.

## Levererat
- **Sort-väljare** i Filter-panelen (sparad i `localStorage`): Senast uppdaterad
  (default = harvesterns `order → nyast → titel`), Äldst uppdaterad, **Nyast
  skapad**, **Äldst skapad**, Titel A–Ö. Klient-sidig `sortComparator`; en delad
  `byDate`-helper lägger pucks utan datum sist.
- **Skapad-datum** härlett ur git (första commit som la till filen), så det inte
  behöver handpysslas — `repo.firstCommitDate()` i harvestern, `created:` i
  frontmatter kan överstyra, `roadmap new` stämplar det framåt. Synken klonar
  treeless (`--filter=blob:none`) så historiken finns i CI.
- **Modalen** visar `Skapad · Uppdaterad` på en rad; korten/listan håller sig
  kompakta med bara uppdaterat-datum.

## Not
Deploy-bugg upptäckt på vägen: Cloudflare hoppar över commits vars meddelande
innehåller CI-skip-tokenet, så den timvisa datan deployade aldrig av sig själv.
Åtgärdat genom att ta bort tokenet ur sync-bottens commit (paths-filtret är den
riktiga loop-vakten).
