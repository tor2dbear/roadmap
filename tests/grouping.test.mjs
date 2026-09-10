// `group=none` — listan utan gruppering alls. En gruppering med *inga värden*, vilket
// är en form filen redan hade förutsett: `columnTerm`, `termAboutGroup` och
// `groupConstrained` inleder var och en med `if (!g.field) return …`, så en fältlös
// gruppering behöver inget undantag någonstans. Det som *inte* fanns sedan tidigare är
// två saker, och det är dem kontrollerna här handlar om:
//
// 1. **Rubriken måste bort — men då tystnar arkivet.** Regeln är att arkivet säger vad
//    det håller tillbaka i huvudet på den kolumn som saknar det. Utan huvud blir dolda
//    done-puckar tysta igen, vilket är precis buggen regeln skrevs för. Svaret: rita
//    huvudet *bara* när arkivet har något att säga, och låt det bära enbart märket.
// 2. **Sorteringen blir hela strukturen.** `order:` är puckens plats *inom sin kolumn*;
//    utan kolumner väver förvalskedjan ihop statusar med ett tal som aldrig betytt något
//    över den gränsen. Grupperingen föreslår därför `status,order` — tavlans egen
//    läsordning utplattad — men bara i frånvaro av ett val.
import { group, eq, ok } from "./assert.mjs";

const url = (p) => new URL(p.url()).search;
const titlar = (p) => p.evaluate(() =>
  [...document.querySelectorAll(".list-row .list-name")].map((e) => e.textContent.trim()));
const statusar = (p) => p.evaluate(() =>
  [...document.querySelectorAll(".list-row")].map((r) => {
    const s = r.querySelector(".status-pill");
    return s ? s.textContent.trim() : "?";
  }));
const huvuden = (p) => p.evaluate(() =>
  [...document.querySelectorAll(".list-head")].map((h) => h.textContent.replace(/\s+/g, " ").trim()));

export async function run({ open }) {
  group("ingen gruppering ritar en lista utan rubrik");
  {
    // Arkivet på, så det inte har något att säga: då ska huvudet inte finnas alls. Det
    // är hela poängen med grupperingen — en rubrik som heter `All pucks` ovanför hela
    // listan är en etikett som upprepar sidan.
    const p = await open("?layout=list&group=none&done=1");
    eq(await p.locator(".list-group").count(), 1, "en enda grupp");
    eq(await huvuden(p), [], "inget huvud ritas när arkivet är tomhänt");
    // 11, inte 12: `All pucks` betyder `-status:inbox`, vilket är vad vyn *är* och
    // inte något man dolt. Grupperingen ändrar inte vilka puckar en vy håller.
    eq((await titlar(p)).length, 11, "alla vyns puckar i samma hink");
    // Och inga av rubrikens delar smyger in på annat sätt.
    eq(await p.locator(".list-group .lh-toggle, .list-group .lh-stub").count(), 0,
      "ingen fällkontroll och ingen stubbe");
  }

  group("arkivet talar ändå — märket, och bara märket");
  {
    // Utan huvud hade de fyra arkiverade puckarna försvunnit tyst, vilket är exakt den
    // tystnad märket skrevs för. Huvudet ritas alltså när det finns något att säga.
    const p = await open("?layout=list&group=none");
    eq((await titlar(p)).length, 7, "arkivet håller tillbaka fyra");
    eq(await huvuden(p), ["4 archived"], "huvudet bär enbart märket");
    // Ingen färgruta (det finns ingen kolumnfärg), inget namn, ingen fällkontroll.
    eq(await p.evaluate(() => {
      const h = document.querySelector(".list-head");
      return [...h.querySelectorAll("*")].map((e) => e.className.baseVal ?? e.className)
        .filter((c) => typeof c === "string" && /swatch|lh-label|lh-toggle|count\b/.test(c) && !/col-archived/.test(c));
    }), ["count"], "bara märkets egen siffra, ingen färgruta och inget namn");
    // Och märket är samma reparation som överallt annars: ett klick ger dem tillbaka.
    await p.locator(".col-archived").click();
    await p.waitForTimeout(200);
    eq((await titlar(p)).length, 11, "ögat lyfter arkivet");
    eq(await huvuden(p), [], "och huvudet försvinner med det, för nu finns inget att säga");
  }

  group("märket heter listan, inte kolumnen");
  {
    // `archivedMark` skrev "in this column" åt alla. Under `group=none` finns ingen
    // kolumn ritad någonstans på sidan, så meningen pekade på något som inte fanns.
    const p = await open("?layout=list&group=none");
    eq(await p.locator(".col-archived").first().getAttribute("aria-label"),
      "Show 4 archived pucks in this list", "märket namnger listan");
    const kol = await open("?layout=list");
    ok((await kol.locator(".col-archived").first().getAttribute("aria-label")).endsWith("in this column"),
      "och kolumnen fortsätter heta kolumn där en sådan ritas");
  }

  group("brädet kan inte rita den, så länken säger inte att den gör det");
  {
    // Samma form som `parent`: layouten vinner och grupperingen stryks, så parametrarna
    // säger vad som faktiskt ritas. Två grupperingar behöver den regeln nu, vilket är
    // varför den står i en tabell (`LIST_ONLY`) och inte som ett andra `=== "parent"`.
    const p = await open("?group=none&layout=board");
    eq(url(p), "", "grupperingen stryks ur URL:en");
    eq(await p.evaluate(() =>
      [...document.querySelectorAll(".board > .column:not(.hidden-cols) .col-head h2")]
        .map((e) => e.textContent.trim())), ["Now", "Next", "Later"],
      "och brädet ritar sina statuskolumner");
  }

  group("grupperingen föreslår en ordning, i frånvaro av ett val");
  {
    // Utplattad läsordning: statusstegen först, rank inom varje status. Utan förslaget
    // hade förvalskedjan (`order,updated`) vävt ihop statusarna efter ett tal som bara
    // betyder något inom en kolumn.
    const p = await open("?layout=list&group=none");
    eq(await statusar(p), ["Now", "Now", "Now", "Next", "Next", "Later", "Later"],
      "status,order — tavlans läsordning utplattad");

    // Och samma puckar under förvalet, med gruppering: där betyder `order` något.
    const g = await open("?layout=list&group=status");
    ok((await statusar(g)).every((s) => s === "?"),
      "under statusgruppering säger raden inte statusen igen (groupSays)");
  }

  group("men aldrig över ett val");
  {
    // Regeln är `autoDateField`s, en våning upp: automatik gäller i frånvaro av ett val,
    // aldrig över det. En vald kedja ritas ordagrant.
    const p = await open("?layout=list&group=none&sort=title-desc");
    const t = await titlar(p);
    eq(t, [...t].sort().reverse(), "vald kedja vinner över förslaget");

    // Och det omvända: samma kedja som förslaget, uttryckligen skriven, ritar samma lista
    // — förslaget är inte en annan ordning, bara den man inte behövde skriva.
    const s = await open("?layout=list&group=none&sort=status,order");
    eq(await titlar(s), await titlar(await open("?layout=list&group=none")),
      "uttryckligt `status,order` ritar samma lista som förslaget");
  }

  group("menyn visar kedjan som ritas, inte den som lagras");
  {
    // En meny som visar en kedja tavlan inte ritar är exakt det fel den saknade `✕` på
    // sista nyckeln finns för att förhindra — och ett förslag väljaren inte kunde se
    // vore samma fel en våning upp.
    const p = await open("?layout=list&group=none");
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    const rad = await p.evaluate(() => {
      const r = [...document.querySelectorAll(".dp-row")]
        .find((e) => /Ordering/.test(e.textContent));
      return r ? r.textContent.replace(/\s+/g, " ").trim() : null;
    });
    ok(/Status/.test(rad), "Display-raden säger Status, inte Manual: " + JSON.stringify(rad));

    // `Reset ordering` jämför mot vad grupperingen *föreslår*, inte mot `DEFAULT_SORT`.
    // Mot konstanten ritades en återställning på en orörd kedja, vars tryck landat på
    // exakt samma rader — en kontroll som inte gör något är värre än en som saknas.
    await p.locator(".pop, .sheet").getByText("Ordering", { exact: true }).click();
    await p.waitForTimeout(150);
    eq(await p.locator(".pop, .sheet").getByText("Reset ordering", { exact: true }).count(), 0,
      "ingen återställning att erbjuda på en orörd kedja");
  }
}
