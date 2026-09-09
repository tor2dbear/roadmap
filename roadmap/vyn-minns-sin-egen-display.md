---
title: Vyn minns sin egen display
status: done
tags: [ui, product]
updated: 2026-09-09
created: 2026-09-08
priority: high
owner: tor2dbear
---

## Goal

Displayinställningarna — gruppering, layout, ordning, egenskaper, arkivväxeln, fällda
grupper — ska höra till **den vy man gjorde dem i**, inte till tavlan som helhet. Ställer
man om `All pucks` till gruppering på parent ska Inbox inte tyst byta med den.

## Research

**Reproducerat, med Display-menyn och inte bara en länk** (det är den vägen som *sparar*):

```
från början        : {}
Display → Grouping → Repo på All pucks
                   : lagrat {"group":"repo"}   url ?group=repo
→ Inbox            : url ?view=inbox           kolumner: Etapp · PIA · Cadence · Méta-Matic
→ Ready            : url ?view=ready&group=repo  kolumner: Etapp · PIA · Cadence · Méta-Matic
```

Grupperingen följer med till bägge. **Och Inbox visar den utan att URL:en säger det** —
`effectiveParams` stryker `group=repo` där, eftersom Inbox är en enda statuskolumn och
`eff()` då faller tillbaka från `status` till `repo` ändå. Inställningen är alltså osynlig
i länken och synlig på skärmen, vilket är den svåraste sorten att upptäcka.

**Regeln finns redan, formulerad för filtret.** `goToView()` bär den ordagrant:

> *Navigation is a fresh start. Clearing only the places left the rest of the filter riding
> along: apply a saved view called High, click Ready, and you were in "Ready, still only
> high priority" — with the chip the one thing saying so. […] leaving one has to leave all
> of it, or the rows in the sidebar stop meaning what they say.*

`goToView` nollar alltså `state.fromView` och hela frågan — men rör inte `state.group`,
`state.view`, `state.sort`, `state.props`, `state.showDone`, `state.showEmpty` eller
`state.collapsed`. Det är samma sorts släpande tillstånd som stycket beskriver, en våning
bort.

**Och det kolliderar med ett annat uttalat beslut**, som pucken måste avgöra och inte
smyga förbi. `CLAUDE.md`: *"Display preferences persist (they're settings, not a transient
filter); a URL that names them wins over these on load."* Lagringen är en nyckel per
inställning (`roadmap-group`, `roadmap-sort`, …) utan något vy-begrepp alls.

Förslaget till upplösning: **"inställning, inte filter" står kvar — men inställningen hör
till vyn den gjordes i.** Det är inte en transient sak som nollas vid navigering; den
minns, per vy. Det är en snävare ändring än den låter, och den bevarar bägge reglerna.

**Sparade vyer är redan så här, och det är den starkaste ledtråden.** `views[]` i
`board.config.json` bär alla åtta nycklarna, så en sparad vy sätter sin gruppering,
sortering och layout när man går in i den (`applySavedView` återställer allt). De
inbyggda vyerna — `all`, `ready`, `inbox`, `parents`, `standalone`, `attention` — är de
enda som saknar det. Frågan är alltså inte "ska display kunna vara per vy" utan "varför är
det bara hälften av vyerna som kan det".

**`collapsed` är det värsta fallet och värt att nämna för sig.** Nycklarna är
grupperingens egna värden, så en fällning gjord under `group=parent` i `All pucks` bär
över till en vy som grupperar på något annat — där matchar den ingenting, eller värre,
matchar `NO_VALUE`-hinken i en annan gruppering. `setDisplay` nollar den redan när
*grupperingen* byts, av exakt det skälet; navigering mellan vyer har ingen motsvarighet.

## Beslut

Frågorna nedan var pucken's egna, och de är avgjorda i den ordning den bad om — skrivna
innan bygget, som den krävde. Regeln i en mening: **navigering nollar filtret och
återställer displayen.**

- **Alla sju nycklarna är per vy** — `VIEW_KEYS` minus de två som inte är display. `view`
  är vyns identitet (det är den minnet nycklas *av*) och `q` är filtret, som navigering
  nollar snarare än minns. `layout` följde med trots tveksamheten: att lämna den utanför
  hade gjort de inbyggda vyerna olika de sparade i exakt en nyckel, och `setDisplay`
  flyttar layouten på egen hand när man väljer hierarkin ändå.
- **En vy man aldrig ställt in öppnar på standard.** Arv vore mjukare och fortfarande
  smittsamt, och värst första gången — den enda gång inget på skärmen kan rätta en. Samma
  resonemang som `goToView` redan för om filtret.
- **En store, `roadmap-display`, ett objekt med vyn som nyckel.** De gamla platta nycklarna
  läses in en gång, in i `all` (den vy de gjordes i, för det är brädan man landar på) och
  tas bort på vägen. Ett tomt objekt skrivs i stället för ingenting, så en store som finns
  men är tom hindrar migreringen från att köra en andra gång.
- **Länken vinner, och skriver inte minnet.** Tre nivåer: URL > vyns minne > standard. Men
  gränsen behövde en egen mening, för `rememberDisplay` lagrar hela brädan och inte den
  nyckel som rörde sig (inställningarna avgör varandra): **en länk man bara tittar på
  skriver ingenting; ett vred man vrider adopterar brädan man vred det på.**
- **En plats är ingen vy.** `goToPlace` sätter `focus = "all"`, så ett repo är `all` med ett
  filter och läser `all`:s minne. Ett minne per repo vore mer än någon bett om — men
  `state.focus` *är* minnets nyckel, så allt som flyttar den måste flytta displayen med
  sig, och det är den halvan som var lätt att missa.
- **En sparad vy får inget lokalt minne.** Den är sin egen post i `board.config.json`, och
  vägen att spara en ändring i den är `Update "<namn>"`. Ett lokalt minne ovanpå hade
  vunnit på vägen in och vyn läst som *(edited)* i samma stund den öppnades — samma form
  som `etapps`-buggen. Det får inte falla igenom till den inbyggda vyn under heller.

`restoreDisplay` är därför den ena vägen in och `rememberDisplay` den enda vägen ut, och
"Reset to default" *glömmer* vyn i stället för att lagra en kopia av standarden.
Kontrollerna ligger i `tests/display.test.mjs`; tre befintliga mätte det gamla beslutet och
är omskrivna med skälet i klartext.
