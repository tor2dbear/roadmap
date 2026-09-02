---
title: Redigeringen byter typsnitt mitt i texten
status: done
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

## Delivered

Två av de tre vägarna, och tillsammans försvinner hoppet helt: **läsningen lyftes**
och **mono blev sans**. Efter det är redigering och läsning samma text i samma
storlek med samma radhöjd — bara lådan skiljer.

**`--prose`, inte ett tal.** Puck-brödtext är 16px på telefon och 14px över 640px,
satt som en variabel på `.modal-body` och `.disc-body`. `.body-editor` *sitter inuti*
`.modal-body` och ärver den, så de två går inte att ändra isär. Det är skillnaden mot
att skriva 16 på två ställen: sabotaget som ger editorn ett eget tal fäller
kontrollen, och sabotaget som tar bort lyftet på telefon fäller den också — genom att
dra ner editorn i zoomen igen. De är hopsvetsade åt bägge hållen.

Rubriker bär brödtextens storlek och skiljs åt med vikt, så en variabel räcker för
bägge och en rubrik kan aldrig hamna mindre än texten under sig. `--prose-sm` är
steget under, för kodblock och tabellceller.

**Mono var andra halvan av hoppet.** Markdown-källa är kod-nära, men mono mäter
bredare per tecken än sans i samma storlek — så samma text kom både större *och*
bredare, och på 390px är det den bredden som läser som klumpig. Det mono faktiskt
köpte var indraget, och `--lh-prose` med två stegs listindrag håller det läsbart ändå.

**Verifiering.** Kontrollen mäter en *likhet*, inte ett tal: editorns storlek,
typsnitt och radhöjd jämförs med en riktig `.modal-body` i samma pane. En hårdkodad
siffra hade bara mätt att någon skrev 16 på två ställen, inte att de hör ihop. På
telefonbredd tillkommer att talet ska vara 16px — där är det inte fritt. Tre sabotage
fäller var sin del: mono tillbaka, lyftet borta, editorn med eget tal.

## Open questions

- **Väg 2 står kvar oprovad:** ge komponisten skärmen, Linear-mönstret på bilden som
  startade det här. Den behövs inte för att stänga hoppet — det är stängt — men en
  ruta som äger skärmen är fortfarande en bättre plats att skriva ett långt stycke på
  än en kolumn i en puck. `openSurface()` gör redan ark på telefon.
- Sans kostar indragets exakthet i källan: i mono radar två inledande blanksteg upp
  sig under varandra, i sans ungefär. Om nästlade listor blir svåra att skriva är det
  där det märks först.
- Gränsen är `max-width: 640px`, samma som resten av filens telefonregler. En iPad i
  landskap får därför 14px i editorn. Repot har redan den konventionen för varje
  annat fält, så det är inte en ny risk — men det är en omätt.

`user-scalable=no` står kvar som förkastad, av samma skäl som förut: den tar
nyp-zoomen från alla för att slippa en zoom i ett fält.
