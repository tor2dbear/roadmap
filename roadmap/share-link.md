---
title: Dela-länk till en puck
status: done
tags: [ui]
updated: 2026-08-16
order: 70
---

## Mål
Kunna länka direkt till ett enskilt kort — för att klistra in i en chatt/agent
eller dela med någon, så den öppnas direkt istället för att man får leta.

## Levererat
- Varje puck har en URL via hash: `…/#<repo>/<slug>` (item-id:t finns redan).
- Öppnar man ett kort speglas det i URL:en (`history.replaceState`, ingen scroll-
  hopp eller history-spam); stänger man rensas hashen.
- Laddar man en URL med `#<id>` öppnas det kortets modal direkt; `hashchange`
  hanterar även inklistrad länk i samma flik och Bakåt.
- **"🔗 Kopiera länk"** i modalens länkrad — kopierar full URL (clipboard-API med
  execCommand-fallback), visar "✓ Kopierad".

## Not
Byggsten för både delning och portabilitet — en stabil referens till ett kort
är det man vill peka en människa eller en agent på.
