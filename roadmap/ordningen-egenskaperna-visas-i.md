---
title: Ordningen egenskaperna visas i
status: later
tags: [ui]
updated: 2026-09-04
created: 2026-09-04
priority: low
owner: tor2dbear
agent: design
depends: [vyn-valjer-sina-egenskaper]
---

## Goal

Inte bara *vilka* egenskaper en vy visar, utan i **vilken ordning** — dra prioriteten
före agenten, lägg datumet först.

## Varför den är låg prio och en egen puck

Att välja bort ett fält tar bort brus. Att flytta ett fält flyttar brus. Den första
vinsten är stor och den andra liten, och de betalas i olika mycket kod — så de hör inte
hemma i samma puck även om de ser ut som samma funktion i menyn.

`depends:` snarare än `parent:`: det här är inte en del av valet, det är något som blir
möjligt först *efter* det. En ordning över en uppsättning som inte går att välja är en
ordning över en lista som är samma för alla.

## Research

Skillnaden mot att välja bort:

- **Kortet** lägger sina märken i `card-meta` i en fast följd av `if`-satser. En ordning
  betyder att den följden blir data — en lista att gå igenom — vilket är en riktig
  omskrivning av funktionen, om än en liten.
- **Listraden** är ett rutnät, och där är ordningen *kolumnernas* ordning. Spåren har
  olika bredd av en anledning (`44px` för prioritet, `148px` för repo, `92px` för
  datum), så att flytta ett fält är att flytta både cellen och dess mått. Det är den
  del som kostar något.
- **Sorteringen i menyn heter redan "Ordering"** och betyder något annat: i vilken
  ordning *puckarna* står. Två saker som heter ordning i samma meny behöver skiljas åt
  i språket innan de skiljs åt i koden.

## Open questions

- Är detta drag-and-drop i en lista, eller räcker det att uppsättningen ritas i den
  ordning man kryssade i den? Det senare är gratis och förvånar en gång; det förra är
  en till dra-yta på en telefon.
- Bär URL:en ordningen som en följd (`fields=priority,date,agent`) och därmed valet
  också? Då är det här mest en fråga om att *inte sortera* listan innan den ritas — och
  då kanske pucken bara är en rad i den den beror på.
