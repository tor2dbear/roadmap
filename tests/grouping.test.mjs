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
  group("None erbjuds bara dar den betyder nagot, och star forst");
  {
    // `Parent` namnger en *sak* att gruppera pa — bradan kan inte rita den som kolumner,
    // sa att valja den darifran ar en riktig begaran som layoutbytet uppfyller. `None`
    // namnger fravaron av bradans egen organiserande princip: en kanban utan gruppering ar
    // inte en brada med en andrad instalining, den ar en lista. Raden vore alltsa ingen
    // gruppering man kan be bradan om, och layoutbytet vore *hela* effekten av att trycka.
    //
    // Och forst i listan, for den ar den enda posten som inte ar ett falt bland andra.
    // Bagge ytorna gar genom `groupOffered`, sa palettens rader foljer utan egen gren —
    // vilket kontrollen mater i stallet for att anta.
    const rader = async (p) => {
      await p.locator("#displayBtn").click();
      await p.waitForSelector(".pop, .sheet");
      await p.locator(".pop, .sheet").getByText("Grouping", { exact: true }).click();
      await p.waitForTimeout(150);
      const r = await p.evaluate(() =>
        [...document.querySelectorAll(".pop .row, .sheet .row")]
          .map((e) => e.textContent.replace(/\s+/g, " ").trim()).filter(Boolean));
      await p.keyboard.press("Escape");
      await p.waitForTimeout(150);
      return r;
    };
    const palett = async (p) => {
      await p.keyboard.press("Meta+k");
      await p.waitForTimeout(250);
      await p.keyboard.type("Group by");
      await p.waitForTimeout(300);
      const r = await p.evaluate(() =>
        [...document.querySelectorAll("#cmdkOverlay .row")]
          .map((e) => e.textContent.replace(/\s+/g, " ").trim()).filter(Boolean));
      await p.keyboard.press("Escape");
      await p.waitForTimeout(150);
      return r;
    };

    const b = await open("");
    eq(await rader(b), ["Status", "Agent", "Repo", "Target", "Parent", "Priority"],
      "bradet erbjuder ingen None — men behaller Parent, som byter layout med sig");
    ok(!(await palett(b)).some((t) => /Group by none/.test(t)),
      "och paletten inte heller, via samma predikat");

    const l = await open("?layout=list");
    eq(await rader(l), ["None", "Status", "Agent", "Repo", "Target", "Parent", "Priority"],
      "listan erbjuder den, forst");
    eq((await palett(l))[0].replace(/Display$/, ""), "Group by none",
      "och den leder palettens grupperingsrader dar ocksa");
  }

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

  group("en fallning under en huvudlos gruppering betyder ingenting");
  {
    // Codex P2. `effectiveParams` slapper igenom `collapsed` for varje listlayout, och den
    // har grenen laser aldrig `state.collapsed` — sa en handskriven lank kunde bara pasta
    // att grupper var fallda medan alla rader stod oppna, utan kontroll att angra det med.
    // NUL ar nyckeln till "ingen"-hinken (`NO_VALUE`), alltsa den enda som ens kunde
    // matcha den har grupperingens enda grupp.
    const p = await open("?layout=list&group=none&collapsed=" + encodeURIComponent("\u0000"));
    eq(url(p), "?group=none&layout=list", "collapsed foljer inte med i lanken");
    eq((await titlar(p)).length, 7, "och ingenting ar fallt");

    // Regressionsvakt: fallningar under en gruppering som *har* rubriker ar ororda.
    const g = await open("?layout=list&group=status&collapsed=now");
    eq(url(g), "?layout=list&collapsed=now", "en riktig fallning star kvar i lanken");
    eq(await g.locator(".list-group.shut").count(), 1, "gruppen ar falld");
    eq(await g.locator(".list-group.shut .list-row").count(), 0, "och tom");
  }

  group("ett val som rakar vara forvalet ar anda ett val");
  {
    // Codex P2, och det var forslaget som svalde det: franvaron av ett val stavades
    // `DEFAULT_SORT`, sa `order,updated` gick inte att be om under den har grupperingen —
    // menyn skrev kedjan, kedjan lastes som "inget valt", och forslaget kom tillbaka.
    // Frånvaron ar `null` nu, precis som `props` redan gor det.
    const p = await open("?layout=list&group=none");
    const kedjan = () => p.evaluate(() =>
      [...document.querySelectorAll(".dp-sort-field")].map((e) => e.textContent.trim()));
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    await p.locator(".pop, .sheet").getByText("Ordering", { exact: true }).click();
    eq(await kedjan(), ["Status", "Manual"], "forslaget ritas nar inget ar valt");

    await p.locator(".dp-sort").first().locator("button.dp-sort-act").last().click();
    await p.waitForTimeout(150);
    eq(await kedjan(), ["Manual"], "kryss pa Status lamnar Manual");
    await p.locator(".pop, .sheet").getByText("Add a key", { exact: true }).click();
    await p.locator(".pop, .sheet").getByText("Updated", { exact: true }).click();
    await p.waitForTimeout(200);
    eq(await kedjan(), ["Manual", "Updated"], "och Updated stannar kvar i kedjan");
    eq(url(p), "?group=none&layout=list&sort=order,updated", "valet star i lanken");

    // Lanken ar darmed reproducerbar — den ritar det den sager.
    const l = await open("?layout=list&group=none&sort=order,updated");
    eq(await statusar(l), ["Now", "Later", "Next", "Now", "Now", "Later", "Next"],
      "rank forst, inte statusstegen");
    eq(url(l), "?group=none&layout=list&sort=order,updated", "och lanken behaller sitt sort");

    // `Reset ordering` aterstaller till *inget val*, inte till forvalskedjan — att lagra
    // forslaget ar precis vad som skulle avsluta det.
    await l.locator("#displayBtn").click();
    await l.waitForSelector(".pop, .sheet");
    await l.locator(".pop, .sheet").getByText("Ordering", { exact: true }).click();
    await l.locator(".pop, .sheet").getByText("Reset ordering", { exact: true }).click();
    await l.waitForTimeout(200);
    eq(url(l), "?group=none&layout=list", "sort forsvinner ur lanken");
    eq(await l.evaluate(() =>
      [...document.querySelectorAll(".dp-sort-field")].map((e) => e.textContent.trim())),
      ["Status", "Manual"], "och forslaget ar tillbaka");
  }

  group("en olaslig sortering ar inget val");
  {
    // Codex P2. `parseSort` maste alltid lamna en kedja — komparatorn ska ha nagot — och
    // det gjorde att en nyckel bradan inte kanner igen befordrades till ett *val*:
    // `order,updated` skiljer sig fran forslaget, sa den beholls och skrevs in i lanken.
    // Regeln stod redan skriven en nyckel bort, om `props`: ett namn bradan inte kanner
    // faller till *inget* val, inte till det tomma. `parseSortKeys` ar den halvan som far
    // svara ingenting.
    const p = await open("?layout=list&group=none&sort=futureField");
    eq(url(p), "?group=none&layout=list", "den okanda nyckeln skrivs inte in i lanken");
    eq(await statusar(p), ["Now", "Now", "Now", "Next", "Next", "Later", "Later"],
      "och forslaget galler, som om inget sort stod dar");

    // Men en giltig nyckel bland ogiltiga ar fortfarande ett val.
    const h = await open("?layout=list&group=none&sort=futureField,title");
    eq(url(h), "?group=none&layout=list&sort=title", "en giltig nyckel overlever sallskapet");
  }

  group("samma lank och samma klick ger samma brada, med eller utan omladdning");
  {
    // Det har ersatter en kontroll som stod har och pastod motsatsen — att en uttrycklig
    // kedja lika med forslaget overlever ett grupperingsbyte. Den holl bara till nasta
    // omladdning, vilket inte ar ett beteende utan en kapplopning med webblasaren:
    //
    //   utan omladdning:  ?layout=list&sort=status,order
    //   med omladdning:   ?layout=list          (dvs order,updated)
    //
    // En kedja lika med vad grupperingen foreslar gar inte att skilja fran inget val alls —
    // inte pa skarmen, inte i lanken, inte i en sparad vy — sa den halls inte som ett.
    // Samma bot som `state`-kommentaren hogst upp i app.js beskriver: sluta halla ett
    // tillstand som inte gar att skilja fran ett annat.
    const byt = async (p, till) => {
      await p.locator("#displayBtn").click();
      await p.waitForSelector(".pop, .sheet");
      await p.locator(".pop, .sheet").getByText("Grouping", { exact: true }).click();
      await p.locator(".pop, .sheet").getByText(till, { exact: true }).first().click();
      await p.waitForTimeout(300);
      await p.keyboard.press("Escape");
      await p.waitForTimeout(150);
    };

    const a = await open("?layout=list&group=none&sort=status,order");
    eq(url(a), "?group=none&layout=list", "forslagslika kedjan skrivs inte ner");
    await byt(a, "Status");
    const utan = url(a);

    const b = await open("?layout=list&group=none&sort=status,order");
    await b.reload();
    await b.waitForSelector(".board", { state: "attached" });
    await b.waitForTimeout(200);
    await byt(b, "Status");
    eq(utan, url(b), "grupperingsbytet ger samma lank bagge vagarna");
    eq(utan, "?layout=list", "och det ar Status egen ordning, inte den forra grupperingens");

    // En kedja som *inte* ar forslaget ar daremot ett val, och foljer med.
    const c = await open("?layout=list&group=none&sort=title");
    eq(url(c), "?group=none&layout=list&sort=title", "ett riktigt val star i lanken");
    await byt(c, "Status");
    eq(url(c), "?layout=list&sort=title", "och overlever bytet");

    // Andra hallet, och det ar den halva `setDisplay` svarar for: kedjan star still och
    // *grupperingen* flyttar forslaget under den. `status,order` ar ett val under Status
    // och forslaget under None.
    //
    // Att bara ga dit racker inte som kontroll — `sortChosen()` haller lanken ren av sig
    // sjalv dar. Skillnaden syns forst ett byte till: utan normaliseringen star
    // `state.sort` kvar som "status,order" och vagen tillbaka ger `?sort=status,order`,
    // medan den omladdade vagen ger `?layout=list`. Hittat genom att sabotera bort anropet
    // och se att ingenting foll — kontrollen matte for kort.
    const d = await open("?layout=list&sort=status,order");
    eq(url(d), "?layout=list&sort=status,order", "under Status ar det ett val");
    await byt(d, "None");
    eq(url(d), "?group=none&layout=list", "under None ar samma kedja forslaget, och stryks");
    await byt(d, "Status");
    const fram = url(d);

    const e = await open("?layout=list&sort=status,order");
    await byt(e, "None");
    await e.reload();
    await e.waitForSelector(".board", { state: "attached" });
    await e.waitForTimeout(200);
    await byt(e, "Status");
    eq(fram, url(e), "vagen tillbaka ger samma lank med och utan omladdning");
    eq(fram, "?layout=list", "och kedjan ar inte kvar fran den forra grupperingen");
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
