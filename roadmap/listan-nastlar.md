---
title: "Listan nästlar noder, inte grupper"
status: done
tags: [ui]
updated: 2026-09-04
created: 2026-09-02
priority: high
target: 2026-09-21
owner: tor2dbear
parent: nastling-listan-nastlar-tavlan-hinkar
---

## Goal

Listans halva: indragna rader med ihopfällbara noder, så att trädet syns som ett träd.

## Delivered

**`groupsOf` behövde inte röras.** Den platta listan den ger bägge renderarna *är*
trädets kanter: en grupp per förälder, med den förälderns direkta barn. Tre drag gör
det ena till det andra, och inget av dem nycklar om något — tavlan behåller hinkarna
den är byggd kring, vilket är hela skälet till att listan kunde gå först.

1. **En grupp vars puck redan ritas som en rad nästlas under den raden.** Det är hela
   "barnens barn hamnar en nivå till ner": mellanpucken var två saker samtidigt — en rad
   i förälderns grupp *och* en egen rubrik längre ner på sidan — och är nu en sak med
   sina delar under sig.
2. **En toppförälder slutar vara en rad under `No parent`** och blir sin egen rubrik.
   Då betyder den gruppen äntligen det den säger: puckar som inte står i något träd alls.
3. **En förälder vars delar filtret tog behåller sin plats**, med en rad som säger
   varför den ser ut som ett löv.

**Karetet sitter i rännan, inte i en egen kolumn.** En kolumn hade behövt finnas på
löven också för att de fem kolumnerna ska stå i register, och ett löv som reserverar
plats för en kontroll det aldrig får är ett mål som inte svarar på något. Rännan
reserveras en gång, av `.is-tree`, och bägge radtyperna lägger sin puck-glyf på samma
ställe.

**Raden bär ingen egen räknare.** `progress` står redan där och svarar på en stadigare
fråga — hur många delar pucken *har* — medan ett antal av raderna under den hade rört
sig med filtret och lästs som att pucken tappat delar. Det var den öppna frågan i den
här pucken, och svaret var att den inte behövde ett nytt tal.

**Indraget har ett tak (fyra nivåer), fast formatet inte har det.** Efter taket slutar
raderna trappa och karetet fortsätter säga vad som ligger i vad. Den andra öppna frågan.

**Två hål, två meningar.** Arkivet och filtret tar bort delar av olika skäl och har
olika reparation, så de säger olika saker: `No matching parts` respektive `1 archived
part 👁`, det senare med samma `liftArchive()` som facket och rubrikens märke.
Bägge på en egen rad — mätt på telefon tog ett `N archived`-märke *på* raden titeln ner
till två tecken, eftersom raden redan bär rollup, prioritet, flagga och datum.

## Sidbredden bröts, och det var ett rutnätsobjekt

Fyndet på köpet, och det som faktiskt syntes på telefonen: dokumentet blev **652px brett
på en 390px-skärm**, så topbaren och chip-raden — som mäts mot viewporten — satt i 60% av
sidan medan raderna sprang ut över kanten.

Tavlan är ett rutnätsobjekt, och ett sådants automatiska minimum är dess *min-content*.
I kolumnläget är det 0 bara därför att `overflow-x: auto` gör den till en scrollbehållare.
Listan stänger av det — och då började det bredaste obrytbara på sidan bestämma
dokumentets bredd. `min-width: 0` på `.lh-label` hjälper inte: den låter objektet *krympa*,
men sänker inte vad det *bidrar med* till behållarens inneboende bredd.

En deklaration på `.board.as-list`, och ellipsen som alltid varit specificerad har
äntligen en bredd att arbeta mot.

## Efterspel: bristen fanns kvar, felläget hade bara flyttat

`min-width: 0` stoppade sidan från att växa — men **spårbristen var densamma**, och den
visade sig i stället som ihoptryckta rader. Mätt vid 700px: de fyra fasta spåren
(prioritet 44, agent 108, repo 148, datum 92) behöll sina 410px medan titeln — det enda
en rad finns för — pressades till 154px och ellipsiserades till "Nästling: li…".

Mediefrågan frågade fel låda. **Raden är så bred som tavlan, och tavlan är inte
fönstret**: sidomenyn tar 240px när den är öppen, så ett 900px-fönster ger listan 660px
medan `min-width: 640px` fortfarande kallar den bred. Därför är nivåerna en
`@container`-fråga mot `.board.as-list`, som numera är container.

Ordningen kolumnerna lämnar i är ett påstående om vad en rad är värd: **agenten först**
(sätts sällan), **sedan repot** (glyfen bär redan dess färg och raden dess namn i sin
tooltip), **aldrig titeln**. Två sabotage vaktar det: vyport-varianten ger 114px titel
vid 900px, och nivåerna flyttade *före* `.list-cell { display: flex }` ger 69px höga
rader — samma specificitet, så källordningen är hela mekanismen, och datumet ramlar ner
under titeln.

## Avgränsning

Nästling *är* vad `group=parent` betyder, inte ett tillval ovanpå vilken gruppering som
helst: ett träd spänner över statusar, så inuti en statuskolumn finns ingen nivå att
rita. En grupp vars egen puck filtret tog nästlas heller inte — det finns ingen rad att
hänga den i, så den behåller sin rubrik som kontext, precis som listan alltid ritat en
rubrik för en förälder som inte själv är på skärmen.

Tavlans halva står kvar i `kolumnen-ar-ett-trad`.
