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
- **`SORT_KEYS`** — nio nycklar, var och en en komparator som svarar om *sig själv* och
  returnerar 0 för oavgjort. `sortComparator()` är en loop över kedjan; `title` avslutar
  varje kedja vare sig den står i den eller inte.
- **`byDate` avgör inte längre sina egna oavgjorda.** Det är den enda strukturella
  ändringen: en nyckel som avslutar med titeln själv kan aldrig stå *först* i en kedja,
  för då nås aldrig nyckeln bakom.
- **`sort=default` skrivs ut som `order,updated-desc`** — det var vad den betydde, och att
  säga det är vad som gör `order` flyttbar och strykbar.
- **`manualRank()`** frågar om rang, inte läge: `order` först betyder att listan står i den
  ordning du lagt den. **`autoDateField()`** tar kedjans *första datumnyckel*, inte första
  nyckeln — annars svarar den "updated" för den vanliga `order,created-desc`.
- **`sort` normaliseras i `effectiveParams`**, bredvid `props`, så en sparad vy med det
  gamla `default` jämförs mot brädan som faktiskt ritas.
- **Menyn visar två listor** — kedjan i ordning, sedan nycklarna som inte är med. Ordningen
  *är* inställningen, och en kryssruta kan aldrig säga att `priority` kommer före `target`.
  `↑` per rad, inte drag: listan sitter i en bottenlåda som själv är dragbar.
- **`tests/sort.test.mjs`**, 24 kontroller: att kedjan kedjar, att de nio gamla stavningarna
  fortfarande går att läsa, att en okänd nyckel stryks, och att menyn bygger kedjan.

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
