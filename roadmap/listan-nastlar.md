---
title: "Listan nästlar noder, inte grupper"
status: next
tags: [ui]
updated: 2026-09-02
created: 2026-09-02
priority: high
target: 2026-09-21
owner: tor2dbear
parent: nastling-listan-nastlar-tavlan-hinkar
---

## Goal

Listans halva: indragna rader med ihopfällbara noder, så att trädet syns som ett träd.

## Research

Listan är den layout där nästling är naturlig — den har redan hopfällning per grupp
(`state.collapsed`) och en radrenderare som inte bryr sig om bredd. Det som saknas är
formen: `groupsOf` ger en platt `[{key,label,items}]`.

Två saker som redan är lösta och inte får tappas bort:

- **Arkivet.** Listan har inget fack, så varje grupp bär sitt eget "N archived"-märke,
  och en grupp som arkivet tömt helt kommer tillbaka som en rubrikstump. Med noder i
  stället för grupper måste den regeln följa med ner i trädet.
- **Hopfällning** är i dag nycklad på gruppnyckeln. Med noder blir varje nod fällbar,
  vilket är fler nycklar men samma mekanism.

## Open questions

- Indraget behöver ett tak även om datan inte har ett — på 390px blir fyra nivåer en
  trappa ut ur skärmen.
- Ärver en hopfälld nod sina barn i räknaren? "3" på en nod som döljer sju puckar under
  sig är fel siffra; underträdets storlek är rätt.
