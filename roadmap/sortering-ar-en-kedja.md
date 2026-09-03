---
title: "Sortering är en kedja, inte ett läge"
status: later
tags: [ui]
updated: 2026-09-02
created: 2026-09-02
priority: medium
target: 2026-09-30
owner: tor2dbear
parent: hierarkin-pa-riktigt
depends: [nastling-listan-nastlar-tavlan-hinkar]
---

## Goal

`sort` blir en lista av nycklar — `sort=priority,target,updated` — så att manuell rank
blir *en nyckel bland andra* i stället för ett läge som utesluter resten.

## Research

Klagomålet var att manuell rank känns klumpig i GUI:t och att propsen borde räcka.
Mätt över 163 puckar: `order` ifyllt 59 gånger, `priority` 2, `target` 0. Propsen är
i praktiken tomma — men det mäter hur mycket produkten använts, inte vad den ska klara,
så det är inget argument mot idén.

Kedjan löser bägge halvorna utan att skrota något: `order:` fortsätter vara giltig
konvention i andra repon, men slutar vara *förvalet*, vilket är det som gör den klumpig.
`sortComparator()` har redan varje nyckel som en egen gren — de blir en tabell och en
reduce. `sort=default` *är* redan "order först, sedan updated", så migreringen är att
skriva ut det och låta användaren ändra ordningen. `manualRank()` blir "är `order`
första nyckeln?".

**Den hör hemma i Display, inte i Filter.** Filter bestämmer *vilka* kort, Display
bestämmer *hur de är ordnade* — layout, gruppering, ordning, arkivet. Lägger vi
sorteringen i filterpanelen får samma sak två platser, vilket `en-sak-en-plats` städade
bort. Progressiv avslöjning är rätt, men i rätt låda.

Frågespråket stavar redan alternativ med komma (`status:now,next`), så en kedja läser
likadant och ryms i den `sort`-nyckel URL:en och sparade vyer redan bär.

## Open questions

- Efter nästlingen är frågan "hur sorteras syskon inom en nod", inte "hur sorteras en
  kolumn". Det är därför den här beror på nästlingen — bygger vi den först får vi bygga
  den två gånger.
- Dragning mellan kolumner skriver `status`, inte rank, och påverkas inte. Den halvan
  är värd att behålla oavsett vad som händer med `order`.
