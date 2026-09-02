---
title: Redigeringen byter typsnitt mitt i texten
status: next
tags: [ui, editing]
updated: 2026-09-02
created: 2026-09-01
---

## Goal

*Edit body* byter ut den renderade puck-texten mot ett fält på samma plats — och
texten växer och byter typsnitt i samma rörelse. Det läser som att man har zoomat,
inte som att man har börjat redigera.

## Research

Mätt i webbläsaren:

- **Renderad text** (`.modal-body`): 14px Geist, `line-height` 22.4px.
- **Redigering** (`.body-editor`): 16px Geist Mono, `line-height` 25.6px.

Två steg upp i skalan (`--fs-lg` → `--fs-2xl`) *och* proportionell → mono i ett
enda byte, i en låda vars innehåll dessutom är samma text.

**16px är iOS golv för fokuserade fält, och det gick inte att ta sig runt.**

## Vad som provades, och vad enheten svarade

Kommentaren ovanför golvet i `styles.css` säger *"where the floor is genuinely
unwanted, the answer is to not have a native field"* — skrivet när de två
`<select>`:arna blev `openSurface()`-väljare. Läsningen var att golvet gäller
**formulärkontroller**, och att en `contenteditable` därför kommer undan. Editorn
byggdes om till `contenteditable="plaintext-only"` på 14px.

**Mätt på telefonen: fel.** Att fokusera den 14px-editerbara diven zoomade sidan med
faktorn **1,147**. `16/14 = 1,143`. Golvet gäller det fokuserade **redigerbara
elementet**, inte vilken tagg det är. Måttet togs ur två skärmdumpar, avståndet från
knappens vänsterkant till ikonens streck: 39→44, 74→85, 114→131, 156→179 px.

Den del av regeln som *generaliserade* var en annan: `<select>` kom undan genom att
inte ha någon redigerbar text alls, inte genom att inte vara en formulärkontroll. En
väljare tar bort skrivandet; en contenteditable flyttar bara på det.

**Och den kostade under tiden.** I Safari stod hela kroppen som en enda hopklistrad
klump — `## Goal Efter en omladdning på iPhone står…` — och ett *Save* hade skrivit
den klumpen till .md-filen. Orsaken var `white-space: pre-wrap`, som togs bort efter
att ha mätts som verkningslös: Chromiums egen stilmall pinnar den för en
`plaintext-only`-låda, Safaris gör det inte. **En mätning i en motor generaliserades
till en regel om alla motorer.** Ingenting hann committas.

Ändringen är återställd. Editorn är en `<textarea>` på 16px igen, och kommentaren i
`startBodyEdit` säger varför så att nästa person inte provar samma sak.

**Testet byttes ut, och bytet är den andra lärdomen.** Den gamla gruppen skrev *ny*
text med tangentbordet och kollade en beräknad `white-space`. Det som gick sönder var
att öppna en *befintlig* flerradig kropp och spara den orörd — vilket ingen kontroll
rörde. Nu mäts precis det, genom commiten: öppna, rör ingenting, spara, och kroppen
ska komma ut tecken för tecken som den gick in. Ett påstående om utfallet överlever
ett byte av mekanism; ett påstående om mekanismen gör det inte.

## Open questions

Kvar står den ursprungliga frågan, och nu vet vi att den inte får kosta en zoom.
Tre vägar, i den ordning jag skulle prova dem:

1. **Lyft läsningen i stället för att sänka skrivandet.** `.modal-body` till 16px på
   telefon. Då finns inget hopp kvar, bägge storlekarna är bekväma, och 16px är rätt
   för brödtext på en telefon ändå — det är bara på desktop 14px är rätt. Billigast,
   och den enda som inte slåss mot plattformen.
2. **Ge komponisten skärmen** (Linear-mönstret på bilden som startade det här). 16px
   känns inte klumpigt i en ruta som äger skärmen; det är i en trång kolumn det gör
   det. `openSurface()` finns redan och gör ark på telefon.
3. **Mono → sans i editorn.** Mindre än de andra, men mono på 16px mäter bredare per
   tecken än sans på 16px, så en del av "klumpigheten" är typsnittet och inte
   storleken.

`user-scalable=no` står kvar som förkastad, av samma skäl som förut: den tar
nyp-zoomen från alla för att slippa en zoom i ett fält.
