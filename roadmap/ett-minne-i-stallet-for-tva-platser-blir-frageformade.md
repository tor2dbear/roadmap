---
title: "Ett minne i stället för två: platser blir frågeformade"
status: now
tags: [ui, dx]
updated: 2026-08-26
created: 2026-08-26
order: 5
---

## Goal
Ta bort `state.repos` och `state.agents` som **lagring**. Behåll sidomenyns rader, men
låt dem skriva och läsa frågan som varje annan kontroll. Ett minne, inte två.

## Research
Frågan som startade det här: är det värt att behandla repos som platser, eller borde de
vara vanliga filter med krutet på custom views i stället?

Svaret är att det är två frågor, och de har olika svar.

### Affordansen förtjänar sitt uppehälle
Ett repo är inte ett filtervärde bland andra — det är **instansens struktur**, deklarerad
i `sources.json`. Koden säger det redan:

> `// A repo is a permanent place, so its zero is worth showing — unlike a view, which`
> `// hides its count when empty because an empty view is not navigation.`

`Workshop 0` står kvar i sidomenyn. Det är rätt. Lägger man till en källa dyker raden upp
utan konfiguration, och en färsk deploy har en meningsfull sidomeny direkt. Sidomenyns
repo-sektion ska alltså vara kvar.

### Lagringen gör det inte
`state.repos` och `state.agents` är en andra sanningskälla för något `state.query` redan
kan uttrycka — mot repots egen regel om att ett filter har exakt ett hem. Underliggande
*är* de redan samma sak; `controlTerms()` projicerar mängderna till termer och `readUrl`
kör det baklänges, med kommentaren *"one model, two directions"*.

Två minnen som måste komma överens kan sluta komma överens, och det har de gjort — två
gånger på en dag:

- **Samma URL ritade två chrome.** `?q=repo:roadmap` gav släckt sidorad och ett chip
  direkt efter klicket, tänd sidorad och inget chip efter en omladdning. Lagat i #14 genom
  att skicka den positiva halvan genom `goToPlace()` — men det lagade *symptomet*.
- **Etikettmaskinen kunde inte skriva "repo".** `fieldByKey` hittar ingenting för repo och
  agent, för de bor i det andra minnet. Chipsraden skrev `Not -repo:roadmap`. Lagat i #14
  med `PLACE_FIELDS` — också ett symptom.

Båda buggarna har samma orsak, och den orsaken finns kvar.

### Agenterna är inte ens en plats
De uppstår ur datan, och koden erkänner det:

```js
state.agents.forEach(function (a) { if (!counts[a]) state.agents.delete(a); }); // prune stale filters
```

En plats som kan **försvinna under en medan man står i den** är ingen plats — och
kommentaren säger "filters" rakt ut. Om något ska sluta bära platsens kläder är det
agenterna, inte repona.

### Och därför custom views *efteråt*, inte i stället
Så länge det finns två mekanismer kan sparade vyer aldrig bli den generella formen — det
kommer alltid finnas ett hål där platserna sitter. Med ett minne blir en sparad vy och en
repo-rad samma sorts sak, och repo-raderna blir förseedade instanser av vyer. Det är då
krutet på vyerna ger avkastning.

## Plan
1. **`state.query` bär allt.** `controlTerms()` utgår; `filterTerms()` blir
   `parseQuery(state.query)`.
2. **Sidomenyn härleder sitt tända läge** ur `filterValues("repo", false)` i stället för ur
   en Set, och skriver hela `owner/name` (samma entydighet som kolumnmenyn fick i #14).
3. **`readUrl`s absorptionsgren utgår** — det finns ingen Set att läsa tillbaka till.
   `?q=` är redan sanningen.
4. **Chipsraden får en presentationsregel**: chippa inte en term som en navrad redan
   visar. Det är en rad om utseende, inte en andra lagring — och `PLACE_FIELDS` kan då
   antagligen utgå.
5. **`pickScope` blir en termoperation**: sätt fältets positiva term till exakt det här
   värdet, eller ta bort den om den redan är ensam.
6. **Den stale-rensning agenterna har försvinner.** En term som inte matchar något är ett
   filter som inte matchar något — synligt och ärligt, inte något som tyst raderas.

## Delivered
- **`state.repos` och `state.agents` är borta.** `state.query` är enda lagringen;
  `controlTerms()` utgick och `filterTerms()` är `parseQuery(state.query)`.
- **Sidomenyn härleder sitt läge** ur `placeValues(field)` — den positiva termen på
  fältet — och skriver hela `owner/name`. `pickScope` blev en termoperation som bär
  samma tre beteenden som Set-versionen: radioknappen, av-knappen och ersättningen.
- **Absorptionsgrenen i `readUrl` utgick.** Kvar står en normalisering: ett kortnamn i en
  länk (`repo:pia-terminal`) resolvas till hela id:t, så raden den namnger tänds — och
  så att en tavla med två likanamnade repon under olika ägare inte kan tända båda.
- **Chipsraden fick sin presentationsregel utskriven.** Att platser inte chippades hände
  förut *av misstag* (de låg inte i `state.query`); nu står det som en rad om utseende.
  Negationen behåller sitt chip — det finns ingen rad för "inte PIA".
- **Agenternas stale-rensning togs bort.** En kö som tömts är nu ett filter som inte
  matchar något: synligt i URL:en och borttagbart, i stället för tyst raderat under en.

## Verification
Kört i webbläsaren, båda riktningarna: klick tänder raden och skriver termen, omladdning
av samma URL ger identiskt läge, andra klicket släcker, ett annat repo ersätter. Ett
kortnamn i en länk tänder rätt rad. En negation blir ett chip och tänder ingen rad. En
vy nollställer platsen. Kolumnmenyns *Show only this* ger samma resultat som sidoraden.

Regression mot #14:s fyra granskningsfynd — show-only ersätter, unhide lagar rätt term,
repo-termen bär hela id:t, `No etapp` frågar `is:member` — alla gröna. Kontrasten ren i
båda temana, noll konsolfel, skörden ren.

## Open questions
- Ska `goToView()` fortfarande nollställa repo och agent? Idag gör den det för att vyn ska
  bli "ren". Med ett minne blir det "ta bort dessa två fält ur frågan", vilket är samma sak
  men värt att skriva ut.
- Sidomenyns rader är enkelval per dimension. Med frågan som lagring vore flerval gratis
  (`repo:a,b`). Är enkelvalet en begränsning värd att behålla, eller ett arv från när det
  var en Set?
