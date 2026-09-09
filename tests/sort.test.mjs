// Ordningen är en kedja av nycklar, inte ett läge. `sort=priority,target,updated-desc`
// går igenom nycklarna i tur och ordning tills en av dem svarar — så manuell rank blir
// *en nyckel bland andra* i stället för det enda läge som utesluter resten. Klagomålet
// var att `order:` känns klumpig; den var det för att den var förvalet man inte kunde
// kombinera med något, inte för att idén var fel.
//
// Kontrollerna nedan är tre: att kedjan faktiskt kedjar (nyckel två avgör där nyckel ett
// är lika), att de nio gamla lägena ritar samma tavla som förut (de ligger i länkar och
// sparade vyer som redan är skickade), och att menyn bygger kedjan.
import { group, eq, ok } from "./assert.mjs";

const titlar = (p) => p.evaluate(() =>
  [...document.querySelectorAll(".list-row .list-name")].map((e) => e.textContent.trim()));
const url = (p) => new URL(p.url()).search;

// Fyra puckar med avsiktligt överlappande fält: `priority` skiljer två par åt, och inom
// varje par pekar `order`, `updated` och titeln åt *olika* håll. Det sista är inte pynt —
// första versionen gav rank 10 åt samma puck som titeln satte först, så `priority,order`
// och `priority,title` ritade samma rad och kontrollen kunde inte se vilken nyckel som
// avgjorde. En fixtur där nycklarna sammanfaller mäter ingenting.
const fyra = (d) => {
  const bas = d.items[0];
  d.items = [
    { ...bas, id: "r/d", slug: "d", title: "D", status: "now", priority: "high",   order: 10, updated: "2026-01-04", created: "2026-01-01", target: null, parent: null, parentRef: null, children: [], depends: [], blockedBy: [], blocks: [], signals: [], tags: [] },
    { ...bas, id: "r/c", slug: "c", title: "C", status: "now", priority: "high",   order: 20, updated: "2026-01-03", created: "2026-01-02", target: null, parent: null, parentRef: null, children: [], depends: [], blockedBy: [], blocks: [], signals: [], tags: [] },
    { ...bas, id: "r/b", slug: "b", title: "B", status: "now", priority: "low",    order: 10, updated: "2026-01-02", created: "2026-01-03", target: null, parent: null, parentRef: null, children: [], depends: [], blockedBy: [], blocks: [], signals: [], tags: [] },
    { ...bas, id: "r/a", slug: "a", title: "A", status: "now", priority: "low",    order: 20, updated: "2026-01-01", created: "2026-01-04", target: null, parent: null, parentRef: null, children: [], depends: [], blockedBy: [], blocks: [], signals: [], tags: [] },
  ];
  return d;
};

export async function run({ open }) {
  group("nyckel två avgör där nyckel ett är lika");
  {
    // Själva poängen. Med bara `priority` faller de lika paren igenom till titeln (kedjans
    // avslutning), och lägger man `order` efter den avgör den inom varje par i stället.
    // Att bägge kedjorna ritas av *samma* fyra puckar är vad som gör skillnaden till ett
    // svar om kedjan och inte om datan.
    const ettLed = await open("?layout=list&sort=priority", { data: fyra });
    eq(await titlar(ettLed), ["C", "D", "A", "B"],
      "bara priority: paren faller igenom till titeln");

    const tvåLed = await open("?layout=list&sort=priority,order", { data: fyra });
    eq(await titlar(tvåLed), ["D", "C", "B", "A"],
      "priority,order: order avgör inom varje prioritet (10 före 20)");

    // Och ordningen mellan nycklarna är betydelsen, inte en uppsättning: vänder man på
    // kedjan byter tavlan skepnad helt.
    const vänt = await open("?layout=list&sort=order,priority", { data: fyra });
    eq(await titlar(vänt), ["D", "B", "C", "A"],
      "order,priority: rank först, prioritet inom varje rank");
  }

  group("en nyckel avgör bara om sig själv — resten är kedjans");
  {
    // `byDate` avslutade sina egna oavgjorda med titeln. En nyckel som gör det kan aldrig
    // stå först i en kedja, för då nås aldrig nyckeln bakom. Två puckar med samma datum
    // och olika rank är exakt det fallet.
    const sammaDag = (d) => {
      const f = fyra(d);
      f.items.forEach((i) => { i.updated = "2026-01-01"; });
      return f;
    };
    const p = await open("?layout=list&sort=updated-desc,order", { data: sammaDag });
    eq(await titlar(p), ["B", "D", "A", "C"],
      "samma datum överallt → order avgör, inte titeln");
  }

  group("de nio gamla lägena ritar samma tavla som förut");
  {
    // De ligger i länkar som kan vara skickade och i sparade vyer som kan vara committade.
    // Sex av nio var redan en enda nyckel under samma stavning; tre var kedjor skrivna som
    // ett ord, och de skrivs ut. `sort=default` *var* "order först, sedan updated".
    const fall = [
      ["default", "order,updated-desc"],
      // `priority` och `status` är nyckelnamn, så de expanderar *inte* — se `LEGACY_SORT`.
      // Deras gamla andra nyckel blir kedjans egen avslutning, titeln. Det är priset för
      // att kedjan `priority` alls ska gå att skriva ner, och det kostar ingenting här: den
      // här brädans sparade vyer bär inget `sort` alls.
      ["priority", "priority"],
      ["status", "status"],
      ["target", "target"],
      ["title", "title"],
      // Sedan riktningen blev en kontroll skrivs den bara ut när den *inte* är fältets
      // förval, så `updated-desc` kortas till `updated`. Det är samma nyckel under ett
      // annat namn — bägge stavningarna läses till samma kedja, vilket är hela villkoret
      // för att en redan skickad länk ska rita samma tavla.
      ["updated-desc", "updated"],
      ["updated-asc", "updated-asc"],
      ["created-desc", "created"],
      ["created-asc", "created-asc"],
    ];
    for (const [gammal, kedja] of fall) {
      const p = await open("?layout=list&sort=" + gammal, { data: fyra });
      const ut = await p.evaluate(() => new URLSearchParams(location.search).get("sort"));
      // `default` är standarden, så den skrivs inte ut i URL:en alls — det är samma regel
      // som gäller varje display-nyckel.
      eq(ut, kedja === "order,updated-desc" ? null : kedja,
        `${gammal} → ${kedja}`);
    }

    // Och det gäller åt bägge håll: ett *ord* expanderas, men samma ord inuti en kedja är
    // nyckeln det namnger. Annars hade `priority,target` smugit in `updated` mellan dem.
    const p = await open("?layout=list&sort=priority,target", { data: fyra });
    eq(await p.evaluate(() => new URLSearchParams(location.search).get("sort")), "priority,target",
      "inuti en kedja är `priority` nyckeln, inte det gamla läget");
  }

  group("en okänd nyckel faller bort, en tom kedja finns inte");
  {
    // Samma regel som `parseProps`: en lagrad kedja från en nyare tavla får inte jämföras
    // olika mot den som faktiskt ritas. Och kedjan kan aldrig tömmas — `parseSort` svarar
    // med standarden — så menyn aldrig visar en kedja tavlan inte följer.
    const p = await open("?layout=list&sort=priority,ingenting", { data: fyra });
    eq(await p.evaluate(() => new URLSearchParams(location.search).get("sort")), "priority",
      "namnet tavlan inte känner stryks");
    const tom = await open("?layout=list&sort=ingenting-alls", { data: fyra });
    eq(await tom.evaluate(() => new URLSearchParams(location.search).get("sort")), null,
      "och en kedja utan giltiga nycklar är standarden, inte tomhet");
  }

  group("varje fält har en riktning, inte bara datumen");
  {
    // Före det här var katalogen nio poster: tre datumfält × två riktningar som egna
    // nycklar, och riktningen inbakad i namnet på de fyra andra (`Priority (high→low)`,
    // `Title A–Z`). Alltså gick `priority` låg→hög och `title` Ö→A inte att be om alls.
    const fram = await open("?layout=list&sort=priority", { data: fyra });
    eq(await titlar(fram), ["C", "D", "A", "B"], "priority: hög först");
    const bak = await open("?layout=list&sort=priority-desc", { data: fyra });
    eq(await titlar(bak), ["A", "B", "C", "D"], "priority-desc: låg först — nytt");

    const az = await open("?layout=list&sort=title", { data: fyra });
    eq(await titlar(az), ["A", "B", "C", "D"], "title: A→Ö");
    const za = await open("?layout=list&sort=title-desc", { data: fyra });
    eq(await titlar(za), ["D", "C", "B", "A"], "title-desc: Ö→A — nytt");

    // Och stavningen är kortast när riktningen är fältets förval, åt bägge hållen: `title`
    // är förvalet asc, `updated` är förvalet desc. Det är det som gör att gamla länkar med
    // `updated-desc` läser samma kedja som en meny som just skrivit `updated`.
    eq(await bak.evaluate(() => new URLSearchParams(location.search).get("sort")), "priority-desc",
      "en vänd riktning skrivs ut");
    const kort = await open("?layout=list&sort=updated-desc", { data: fyra });
    eq(await kort.evaluate(() => new URLSearchParams(location.search).get("sort")), "updated",
      "en riktning som är förvalet skrivs inte ut");
  }

  group("Manual har ingen riktning, och suffixet ignoreras");
  {
    // Skälet är inte symmetri: en vänd manuell rank hade tyst *stängt av dragningen*,
    // eftersom `manualRank()` frågar efter exakt nyckeln `order` först i kedjan. En kontroll
    // vars enda synliga verkan är att slå av en annan kontroll är sämre än ingen kontroll.
    const p = await open("?layout=list&sort=order-desc", { data: fyra });
    eq(await p.evaluate(() => new URLSearchParams(location.search).get("sort")), "order",
      "`order-desc` läses tillbaka som `order` — inte ens en handskriven länk kan be om den");
    // Och tavlan ritas framlänges: rank 10 (D, B) före rank 20 (C, A), titeln avgör inom
    // varje rank. Vänd hade gett C, A, D, B.
    eq(await titlar(p), ["B", "D", "A", "C"], "och brädan står framlänges");
  }

  group("saknat värde ligger sist åt bägge hållen");
  {
    // Codex, P2 på #52, och ett riktigt fel. Ett tecken på svaret räcker inte: sentinelrangen
    // för "ingen prioritet" blev *minst* när kedjan vändes, så en opriorterad puck hamnade
    // först under en kontroll vars egen etikett lovar "low → high". `byDate` har alltid haft
    // regeln — odaterade puckar ligger sist åt bägge håll — och de rangordnade fälten hade
    // den inte. Ett saknat värde är inte skalans ytterände, det ligger utanför skalan.
    //
    // `group=repo` i bägge fallen, inte den förvalda statusgrupperingen: annars mäter
    // "sist i listan" vilken *grupp* pucken hamnade i och inte hur kedjan ordnade den.
    // Första utkastet gjorde exakt det och föll på alla fyra av fel skäl.
    const utanPrio = (d) => { const f = fyra(d); f.items[3].priority = null; return f; };
    eq(await titlar(await open("?layout=list&group=repo&sort=priority", { data: utanPrio })),
      ["C", "D", "B", "A"], "utan prioritet sist framlänges");
    eq(await titlar(await open("?layout=list&group=repo&sort=priority-desc", { data: utanPrio })),
      ["B", "C", "D", "A"], "och sist baklänges också — inte först");

    // Två kända statusar, så vändningen syns, plus en som nyttolasten inte namnger.
    const okändStatus = (d) => {
      const f = fyra(d);
      f.items[1].status = "done";               // C
      f.items[3].status = "ingen-sådan-status"; // A
      return f;
    };
    eq(await titlar(await open("?layout=list&group=repo&done=1&sort=status", { data: okändStatus })),
      ["B", "D", "C", "A"], "okänd status sist framlänges, done efter now");
    eq(await titlar(await open("?layout=list&group=repo&done=1&sort=status-desc", { data: okändStatus })),
      ["C", "B", "D", "A"], "vänt kommer done först — och den okända ligger kvar sist");
  }

  group("ett fält kan bara stå en gång i kedjan");
  {
    // `updated,updated-asc` är två svar på en fråga, och det andra kunde aldrig nås ändå.
    const p = await open("?layout=list&sort=updated,updated-asc,order", { data: fyra });
    eq(await p.evaluate(() => new URLSearchParams(location.search).get("sort")), "updated,order",
      "andra förekomsten av samma fält faller bort, riktning eller ej");
  }

  const öppnaMenyn = async (p) => {
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    await p.locator(".pop, .sheet").getByText("Ordering", { exact: true }).click();
    await p.waitForTimeout(200);
  };
  const rader = (p) => p.evaluate(() =>
    [...document.querySelectorAll(".dp-sort")].map((r) => ({
      fält: r.querySelector(".dp-sort-field span").textContent.trim(),
      riktning: r.querySelector(".dp-sort-dir span")?.textContent.trim() ?? null,
      upp: !!r.querySelector('.dp-sort-act[title^="Move"]'),
    })));

  group("menyn är en lista, inte två — och behöver därför ingen förklarande text");
  {
    const p = await open("", { data: fyra, token: true });
    await öppnaMenyn(p);

    eq(await rader(p), [
      { fält: "Manual", riktning: null, upp: false },
      { fält: "Updated", riktning: "newest → oldest", upp: true },
    ], "standarden står som två rader — och Manual har ingen riktning att vända");

    // Klagomålet som startade det här: när en yta behöver en mening som förklarar vilka
    // rader som är vilka har strukturen misslyckats. Katalogen ligger bakom `Add a key`,
    // det finns en lista kvar, och meningen har inget att göra.
    eq(await p.evaluate(() => document.querySelectorAll(".pop .dp-note, .sheet .dp-note").length), 0,
      "ingen not i ordningsytan");

    // Första raden har ingen `↑` — men den har en lucka lika bred, annars stegar
    // fältnamnen 24px åt vänster på rad ett och kolumnen läses som ett fel.
    eq(await p.evaluate(() => document.querySelectorAll(".dp-sort-gap").length), 1,
      "en lucka, på den enda rad som saknar ↑");
  }

  group("riktningen är en växel på raden");
  {
    const p = await open("", { data: fyra, token: true });
    await öppnaMenyn(p);
    await p.evaluate(() => document.querySelectorAll(".dp-sort")[1].querySelector(".dp-sort-dir").click());
    await p.waitForTimeout(250);
    eq(url(p), "?sort=order,updated-asc", "ett tryck vänder nyckeln");
    eq((await rader(p))[1].riktning, "oldest → newest", "och raden säger vad den nu är");

    // Två alternativ är en växel, inte en väljare: en chevron hade lovat en lista med två
    // rader i och kostat ett tryck till för samma sak.
    await p.evaluate(() => document.querySelectorAll(".dp-sort")[1].querySelector(".dp-sort-dir").click());
    await p.waitForTimeout(250);
    eq(url(p), "", "och tillbaka igen — standarden skrivs inte ut alls");
  }

  group("fältet byts på plats");
  {
    const p = await open("", { data: fyra, token: true });
    await öppnaMenyn(p);
    // Förut fanns ingen väg att ändra *första* nyckeln: man fick ta bort den (kedjan blev
    // en kortare) och lägga till den igen, där den hamnade sist.
    await p.evaluate(() => document.querySelectorAll(".dp-sort")[0].querySelector(".dp-sort-field").click());
    await p.waitForTimeout(200);
    const val = await p.evaluate(() =>
      [...document.querySelectorAll(".pop .row, .sheet .row")].map((r) => r.getAttribute("data-value")));
    eq(val, ["order", "status", "priority", "target", "created", "title"],
      "fält som redan står i kedjan erbjuds inte — utom raden man står i");

    await p.locator(".pop, .sheet").getByText("Priority", { exact: true }).click();
    await p.waitForTimeout(250);
    eq(url(p), "?sort=priority,updated", "fältet byts, platsen behålls");
    eq((await rader(p))[0].riktning, "high → low",
      "och det nya fältet tar sin egen riktning — `newest → oldest` är inget priority kan vara");
  }

  group("varje väg genom ytan lämnar exakt en yta");
  {
    // Rapporterat från en telefon, med skärmdump: `‹ Add a key` ritade kedjan *under*
    // väljaren i stället för att ersätta den, och en gång till för varje tryck. Samma fel
    // som `apply()` hade före — `renderSortChain` rensade inte, utan litade på att den som
    // anropade den hade gjort det. Den lappen höll så länge funktionen hade en anropare;
    // nivå 3 gav den tre till.
    //
    // Kontrollen frågar därför inte om just den knappen utan om *invarianten*: efter varje
    // steg finns det precis en bakåtrad och kedjan står ritad en gång. En konvention som
    // måste kommas ihåg på varje anropsställe är ingen konvention.
    const p = await open("?sort=order,updated", { data: fyra, token: true });
    const yta = () => p.evaluate(() => ({
      bak: document.querySelectorAll(".pop .fp-back, .sheet .fp-back").length,
      rader: document.querySelectorAll(".dp-sort").length,
      val: document.querySelectorAll('.pop .row[data-value], .sheet .row[data-value]').length,
    }));
    await öppnaMenyn(p);
    eq(await yta(), { bak: 1, rader: 2, val: 0 }, "kedjan: en bakåtrad, två nycklar");

    await p.locator(".pop, .sheet").getByText("Add a key", { exact: true }).click();
    await p.waitForTimeout(200);
    eq(await yta(), { bak: 1, rader: 0, val: 5 }, "väljaren *ersätter* kedjan");

    // Vägen tillbaka, som var det som rapporterades.
    await p.locator(".pop, .sheet").getByText("Add a key", { exact: true }).click();
    await p.waitForTimeout(200);
    eq(await yta(), { bak: 1, rader: 2, val: 0 }, "och bakåt ersätter väljaren");

    // Två varv till, eftersom felet växte per tryck och ett enda varv hade sett rätt ut
    // även med den gamla koden på det första steget.
    for (let i = 0; i < 2; i++) {
      await p.locator(".pop, .sheet").getByText("Add a key", { exact: true }).click();
      await p.waitForTimeout(150);
      await p.locator(".pop, .sheet").getByText("Add a key", { exact: true }).click();
      await p.waitForTimeout(150);
    }
    eq(await yta(), { bak: 1, rader: 2, val: 0 }, "och tre varv staplar ingenting");

    // Den andra vägen ut ur väljaren: att faktiskt välja ett fält.
    await p.locator(".pop, .sheet").getByText("Add a key", { exact: true }).click();
    await p.waitForTimeout(200);
    await p.locator(".pop, .sheet").getByText("Status", { exact: true }).click();
    await p.waitForTimeout(250);
    eq(await yta(), { bak: 1, rader: 3, val: 0 }, "ett valt fält lämnar också en yta");
    eq(url(p), "?sort=order,updated,status", "och hamnar sist i kedjan");

    // Och bakåtraden längst upp går till Displays rot, inte till väljaren.
    await p.locator(".pop, .sheet").getByText("Ordering", { exact: true }).click();
    await p.waitForTimeout(200);
    // Rotens rader är `.fp-row`, inte `.row` — det är två olika radformer i samma meny.
    eq(await p.evaluate(() =>
      [...document.querySelectorAll(".pop .fp-row, .sheet .fp-row")].some((r) => /Grouping/.test(r.textContent))),
      true, "kedjans egen bakåtrad når Displays rot");
  }

  group("lägg till och nollställ");
  {
    const p = await open("?sort=title", { data: fyra, token: true });
    await öppnaMenyn(p);
    await p.locator(".pop, .sheet").getByText("Add a key", { exact: true }).click();
    await p.waitForTimeout(200);
    await p.locator(".pop, .sheet").getByText("Status", { exact: true }).click();
    await p.waitForTimeout(250);
    eq(url(p), "?sort=title,status", "vald nyckel hamnar sist — den bryter de oavgjorda de ovanför lämnar");

    // En smal nollställning, och den behöver vara smal: Displays egen "Reset to default"
    // sätter tillbaka alla sju display-nycklarna.
    await p.locator(".pop, .sheet").getByText("Reset ordering", { exact: true }).click();
    await p.waitForTimeout(250);
    eq(url(p), "", "ordningen tillbaka till standarden, och inget annat rört");
    eq(await p.evaluate(() =>
      [...document.querySelectorAll(".pop, .sheet")].some((s) => /Reset ordering/.test(s.textContent))), false,
      "och raden står inte kvar när kedjan redan *är* standarden");
  }

  group("raden håller på en telefon — det var där felet rapporterades");
  {
    // Hela ändringen kom från en skärmdump på 390px, så formen mäts där. `target` har
    // katalogens längsta riktningsetikett (`soonest → latest`), och `Manual` ligger bredvid
    // den — så det här är den bredaste rad menyn kan rita.
    const p = await open("?sort=target,order", {
      data: fyra, token: true, viewport: { width: 390, height: 844 }, hasTouch: true,
    });
    await öppnaMenyn(p);
    const mått = await p.evaluate(() => {
      const rows = [...document.querySelectorAll(".dp-sort")];
      return rows.map((r) => {
        const dir = r.querySelector(".dp-sort-dir");
        const acts = [...r.querySelectorAll(".dp-sort-act, .dp-sort-gap")];
        return {
          spill: r.scrollWidth - r.clientWidth,
          fält: Math.round(r.querySelector(".dp-sort-field").getBoundingClientRect().width),
          riktning: dir ? dir.textContent.trim() : null,
          riktningKapad: !!dir && dir.scrollWidth > dir.clientWidth + 1,
          kontroller: acts.map((a) => Math.round(a.getBoundingClientRect().width)),
        };
      });
    });
    eq(mått.map((m) => m.spill), [0, 0], "ingen rad spiller ur lådan");
    eq(mått[0].riktning, "soonest → latest", "den längsta etiketten står oklippt");
    eq(mått.map((m) => m.riktningKapad), [false, false], "och ellipsiseras inte heller");
    eq(mått[1].riktning, null, "Manual-raden har ingen riktningsruta alls");
    // Ikonkontrollerna är fasta märken: fältnamnet och riktningen får ge, aldrig de. Det
    // är listrubrikernas regel en yta bort — där kostade den fyra bortslipade pixlar innan
    // någon såg det, så den frågar varje rad och inte bara den trängsta.
    eq(mått.map((m) => m.kontroller), [[34, 34], [34, 34]],
      "↑/lucka och ✕ behåller sina 34px på en tumyta");
    ok(mått.every((m) => m.fält >= 60), "och fältnamnet har plats kvar: " +
      JSON.stringify(mått.map((m) => m.fält)));
  }

  group("den sista nyckeln kan inte tas bort");
  {
    const p = await open("?layout=list&sort=title", { data: fyra, token: true });
    await öppnaMenyn(p);
    const en = await p.evaluate(() => {
      const rows = [...document.querySelectorAll(".dp-sort")];
      return { rader: rows.length, knappar: rows[0].querySelectorAll(".dp-sort-act").length };
    });
    eq(en.rader, 1, "en nyckel i kedjan");
    eq(en.knappar, 0,
      "varken ↑ eller ✕ — en kontroll som bara misslyckas när man trycker är inte spärrad, den är dekorerad");
  }

  group("↑ flyttar nyckeln uppåt");
  {
    const p = await open("?sort=order,updated,priority", { data: fyra, token: true });
    await öppnaMenyn(p);
    await p.evaluate(() => document.querySelectorAll(".dp-sort")[2].querySelector(".dp-sort-act").click());
    await p.waitForTimeout(250);
    eq(url(p), "?sort=order,priority,updated", "↑ byter plats med raden ovanför");
  }


  // Ingen kontroll för `manualRank()` här, och det är avsiktligt: dess enda konsument är
  // rank-släppet *inom* en kolumn, som bara finns som en `dragover`-lyssnare — det syns
  // inte i DOM:en utan en riktig dragning. `draggable` mäter kolumn-släppet, som skriver
  // `status` och enligt pucken inte påverkas alls; en kontroll på det hade mätt fel sak.
  // Standardkedjan har `order` först, så brädans befintliga dragkontroller täcker det
  // fallet; grenen där `order` ligger längre ner är en medveten lucka.

  group("datumet som visas är kedjans första datumnyckel");
  {
    // `autoDateField` visar det datum ordningen *handlar om*. Att bara läsa kedjans första
    // nyckel hade svarat "updated" för den vanliga `order,created-desc` — vilket är precis
    // den skenbart skakade kolumnen regeln finns för att förhindra.
    const p = await open("?layout=list&sort=order,created-desc", { data: fyra });
    eq(await p.evaluate(() => document.querySelector(".list-dt .date-tag, .list-dt")?.textContent.trim()),
      "2026-01-03", "created-desc bakom order → skapandedatumet, inte uppdateringen");
  }
}
