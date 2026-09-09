---
title: "Sortering är en kedja, inte ett läge"
status: done
tags: [ui]
updated: 2026-09-09
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

## Delivered

Beskriver vad som faktiskt skeppade. Menyn byggdes om i samma PR (#52) efter att den här
kedjan visat sig ha rätt modell men fel yta, så posterna nedan är slutläget och inte det
mellanläge kedjan passerade — en `done`-puck som beskriver ett mellanläge är sämre än ingen
beskrivning alls, eftersom den läses som brädans sanning.

- **`SORT_FIELDS`** — sju fält, var och en med ett förval och bägge riktningsetiketterna.
  `sortCmp` sätter ett tecken på svaret; `sortComparator()` är en loop över kedjan, och
  `title` avslutar varje kedja vare sig den står i den eller inte.
- **`byDate` avgör inte längre sina egna oavgjorda.** Det är den enda strukturella
  ändringen: en nyckel som avslutar med titeln själv kan aldrig stå *först* i en kedja,
  för då nås aldrig nyckeln bakom.
- **Ett saknat värde ligger sist åt bägge hållen**, som `byDate` alltid gjort med odaterade
  puckar. `rank` svarar `null` för frånvaro; ett sentinelnummer gick att jämföra av misstag
  och satte opriorterade puckar först så fort kedjan vändes.
- **`sort=default` skrivs ut som `order,updated`** — det var vad den betydde, och att säga
  det är vad som gör `order` flyttbar och strykbar.
- **En nyckel är `field`, eller `field-asc`/`field-desc`** när riktningen inte är fältets
  förval. `manualRank()` frågar om rang, inte läge — och om `order` *framlänges*.
  **`autoDateField()`** tar kedjans *första datumnyckel*, inte första nyckeln.
- **`sort` normaliseras i `effectiveParams`**, bredvid `props`, så en sparad vy med det
  gamla `default` jämförs mot brädan som faktiskt ritas.
- **Menyn är en lista**, inte två: en rad per nyckel — `[↑] Fält riktning ✕` — med katalogen
  bakom `＋ Add a key`. Ordningen *är* inställningen, och en kryssruta kan aldrig säga att
  `priority` kommer före `target`. `↑` per rad, inte drag: listan sitter i en bottenlåda som
  själv är dragbar.
- **`tests/sort.test.mjs`**, 58 kontroller: att kedjan kedjar, riktning per fält, saknat
  värde sist åt bägge hållen, att de gamla stavningarna fortfarande går att läsa, att en
  okänd nyckel stryks, att menyn bygger kedjan, och att varje väg genom ytan lämnar exakt
  en yta.

## Granskningsfynd och egna fel
- **Legacy-expansionen bröt rundgången.** Expanderar man `priority` → `priority,updated-desc`
  och `status` → `status,order` bevaras de gamla länkarna exakt — men bägge orden är
  *nyckelnamn*, så menyn kunde bygga kedjan `priority`, serialisera den som `priority`, och
  nästa läsning satte tillbaka `updated-desc`. En kontroll som tyst ångrar sig är värre än en
  oavgjord som flyttat, så bara `default` expanderar: det enda av de tre orden som inte också
  är en nyckel. Priset är synligt på ett ställe och fångades av brädans egen befintliga
  kontroll: `sort=status` betydde "brädans läsordning utplattad" och stavas `sort=status,order`
  nu. Det är migreringen, inte en förlust.
- **Codex läste om det som en brytande ändring, och den kompatibla vägen byggdes innan den
  togs bort igen.** P1 på PR #52: behåll alla tre expansionerna och ge enkelnyckel-kedjan en
  otvetydig stavning i stället — `priority,title`, eftersom `title` avslutar varje kedja ändå
  och att skriva ut den ändrar ingen ordning. Det *fungerar*, och menyns `✕`-regel
  generaliserar med den till ett villkor som täcker bägge fallen. Den revertades ändå, för
  kompatibiliteten har **ingen instans**: ingen av brädans två sparade vyer i
  `board.config.json` bär något `sort` alls, och inget dokument namnger vad orden betyder.
  Kvar hade blivit en stavning ingen behöver och en andra regel om vilken kontroll som får
  ritas. Att peka om ett ord är gratis så länge ingenting läser det — och att kontrollera
  *det* först är lärdomen, inte att fyndet var fel: premissen var det. Samma instinkt som
  arkivmärkets vakt, som skrevs först och togs bort när sabotage inte kunde fälla den.
- **Fixturen kunde inte se skillnad på nyckel två och titeln.** `tests/sort.test.mjs` gav
  rank 10 åt samma puck som titeln satte först, så `priority,order` och `priority,title`
  ritade samma rad — hela gruppen "nyckel två avgör där nyckel ett är lika" mätte ingenting.
  Hittades under Codex-rundan och är det enda som blev kvar av den. Lagat: `order`, `updated`
  och titeln pekar nu åt olika håll inom varje par.
- **Menyn ritade om utan att rensa.** `apply()` anropade `renderSortChain` direkt i stället
  för `renderDisplayValues`, som är den som tömmer ytan och ritar vägen tillbaka. Mätt: tre
  klick gav sju rader och ingen rubrik.
- **En kontroll som mätte fel sak.** Första försöket att täcka `manualRank()` läste
  `.card[draggable]` — men det är *kolumn*-släppet, som skriver `status` och enligt pucken
  inte påverkas alls. Kontrollen är borttagen och luckan utskriven i testfilen: rank-släppet
  inom en kolumn är bara en `dragover`-lyssnare och syns inte utan en riktig dragning.
